export type UserRole = "ADMIN" | "OWNER" | "MANAGER" | "ATTENDANT";
export type TenantStatus = "ACTIVE" | "PENDING" | "SUSPENDED" | "UNKNOWN";

const allowedRoles: UserRole[] = ["ADMIN", "OWNER", "MANAGER", "ATTENDANT"];

function parseSession(headers: Headers) {
  const cookie = headers.get("cookie") || "";
  const match = cookie.match(/ez_session=([^;]+)/);
  if (!match) return null;
  try {
    const json = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
    return json as { tenantId?: string; role?: string; tenantStatus?: string };
  } catch {
    return null;
  }
}

export function parseRole(headers: Headers): UserRole {
  const session = parseSession(headers);
  const raw = session?.role?.toUpperCase() || headers.get("x-role")?.toUpperCase();
  if (raw && allowedRoles.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  if (process.env.DEFAULT_ROLE && allowedRoles.includes(process.env.DEFAULT_ROLE as UserRole)) {
    return process.env.DEFAULT_ROLE as UserRole;
  }
  return "OWNER";
}

export function parseTenant(headers: Headers): string | null {
  const session = parseSession(headers);
  const fromSession = session?.tenantId;
  if (fromSession?.length) return fromSession;
  const headerTenant = headers.get("x-tenant-id");
  if (headerTenant?.length) return headerTenant;
  if (process.env.DEFAULT_TENANT_ID) return process.env.DEFAULT_TENANT_ID;
  return null;
}

export function parseTenantStatus(headers: Headers): TenantStatus {
  const session = parseSession(headers);
  const raw = session?.tenantStatus?.toUpperCase();
  if (raw === "ACTIVE" || raw === "PENDING" || raw === "SUSPENDED") return raw;
  return "UNKNOWN";
}

export function isAllowed(role: UserRole, allowed: UserRole[]) {
  return allowed.includes(role);
}
