import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseRole, parseTenant, isAllowed, type UserRole } from "./src/lib/auth";

const roleRules: { pattern: RegExp; allowed: UserRole[] }[] = [
  { pattern: /^\/admin/i, allowed: ["OWNER"] },
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
  const path = request.nextUrl.pathname;

  // Require tenant identifier in prod; allow fallback in local/dev.
  if (!tenantId) {
    return NextResponse.json(
      { error: "Missing tenant context. Provide X-Tenant-Id or set DEFAULT_TENANT_ID." },
      { status: 400 },
    );
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
