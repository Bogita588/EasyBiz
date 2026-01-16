import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseRole, parseTenant, parseTenantStatus, isAllowed, type UserRole } from "./src/lib/auth";
import { rateLimit } from "./src/middleware/rate-limit";
import { runWithTenant } from "./src/lib/tenant-context";
import { redisRateLimit } from "./src/middleware/redis-rate-limit";

const roleRules: { pattern: RegExp; allowed: UserRole[] }[] = [
  { pattern: /^\/admin/i, allowed: ["ADMIN"] },
  { pattern: /^\/api\/admin/i, allowed: ["ADMIN"] },
  { pattern: /^\/settings/i, allowed: ["OWNER"] },
  { pattern: /^\/suppliers/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/inventory/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/money/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/collections/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/collections/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/sales\/quick/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/sales\/quick/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/purchase-orders/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/suppliers/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/items/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/tenant\/seats/i, allowed: ["OWNER"] },
  // Selling/invoicing can be done by attendants too.
  { pattern: /^\/invoice/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
  { pattern: /^\/api\/invoices/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
  { pattern: /^\/api\/payments/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
  { pattern: /^\/users/i, allowed: ["OWNER"] },
  { pattern: /^\/api\/users/i, allowed: ["OWNER"] },
];

export async function middleware(request: NextRequest) {
  const role = parseRole(request.headers);
  const tenantId = parseTenant(request.headers);
  const tenantStatus = parseTenantStatus(request.headers);
  const path = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  const limited = await redisRateLimit(request);
  if (limited) return limited;
  const limitedMemory = rateLimit(request);
  if (limitedMemory) return limitedMemory;

  // Force landing page to registration choice.
  if (path === "/") {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  // CSRF protection for state-changing requests (webhooks bypassed).
  const csrfBypass =
    path.startsWith("/api/payments/mpesa/webhook") ||
    path.startsWith("/_next") ||
    method === "OPTIONS";
  const mutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (mutating && !csrfBypass) {
    const csrfCookie = request.cookies.get("ez_csrf")?.value;
    const csrfHeader = request.headers.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ error: "CSRF validation failed." }, { status: 403 });
    }
  }

  // Admin routes can run without tenant context (used for provisioning) but require admin role.
  if (/^\/admin/i.test(path) || /^\/api\/admin/i.test(path)) {
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // If already authenticated and hits auth/register pages, send to appropriate area.
  if (tenantId && (path === "/register" || path === "/login")) {
    if (tenantStatus === "PENDING") {
      return NextResponse.redirect(new URL("/access/pending", request.url));
    }
    if (tenantStatus === "SUSPENDED") {
      return NextResponse.redirect(new URL("/access/suspended", request.url));
    }
    return NextResponse.redirect(new URL("/home", request.url));
  }

  // Require tenant identifier in prod; allow fallback in local/dev.
  if (!tenantId) {
    // Allow auth and status pages without a session.
    if (
      /^\/login/i.test(path) ||
      /^\/signup/i.test(path) ||
      /^\/register/i.test(path) ||
      /^\/access\/pending/i.test(path) ||
      /^\/access\/suspended/i.test(path)
    ) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/register", request.url));
  }

  // Block ERP if tenant not active.
  if (tenantStatus === "PENDING") {
    return NextResponse.redirect(new URL("/access/pending", request.url));
  }
  if (tenantStatus === "SUSPENDED") {
    return NextResponse.redirect(new URL("/access/suspended", request.url));
  }

  for (const rule of roleRules) {
    if (rule.pattern.test(path) && !isAllowed(role, rule.allowed)) {
      return NextResponse.json(
        { error: "Not allowed for this role.", role, path },
        { status: 403 },
      );
    }
  }

  return runWithTenant(tenantId, async () => {
    const response = NextResponse.next();
    response.headers.set("x-tenant-id", tenantId);
    response.headers.set("x-role", role);
    // Issue CSRF token if absent.
    const existingCsrf = request.cookies.get("ez_csrf")?.value;
    if (!existingCsrf) {
      const token =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      response.cookies.set("ez_csrf", token, {
        path: "/",
        sameSite: "lax",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8,
      });
    }
    return response;
  });
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
