import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseRole, parseTenant, parseTenantStatus, isAllowed, type UserRole } from "./src/lib/auth";

const roleRules: { pattern: RegExp; allowed: UserRole[] }[] = [
  { pattern: /^\/admin/i, allowed: ["OWNER"] },
  { pattern: /^\/api\/admin/i, allowed: ["OWNER"] },
  { pattern: /^\/settings/i, allowed: ["OWNER"] },
  { pattern: /^\/suppliers/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/inventory/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/money/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/purchase-orders/i, allowed: ["OWNER", "MANAGER"] },
  { pattern: /^\/api\/suppliers/i, allowed: ["OWNER", "MANAGER"] },
  // Selling/invoicing can be done by attendants too.
  { pattern: /^\/invoice/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
  { pattern: /^\/api\/invoices/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
  { pattern: /^\/api\/payments/i, allowed: ["OWNER", "MANAGER", "ATTENDANT"] },
];

export function middleware(request: NextRequest) {
  const role = parseRole(request.headers);
  const tenantId = parseTenant(request.headers);
  const tenantStatus = parseTenantStatus(request.headers);
  const path = request.nextUrl.pathname;

  // Force landing page to registration choice.
  if (path === "/") {
    return NextResponse.redirect(new URL("/register", request.url));
  }

  // Admin routes can run without tenant context (used for provisioning) but require admin role.
  if (/^\/admin/i.test(path) || /^\/api\/admin/i.test(path)) {
    if (role !== "ADMIN" && role !== "OWNER") {
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
    // If user is on login/register routes, allow through.
    if (/^\/login/i.test(path) || /^\/signup/i.test(path) || /^\/register/i.test(path)) {
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

  const response = NextResponse.next();
  response.headers.set("x-tenant-id", tenantId);
  response.headers.set("x-role", role);
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
