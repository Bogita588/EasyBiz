export type UserRole = "OWNER" | "MANAGER" | "ATTENDANT";

const allowedRoles: UserRole[] = ["OWNER", "MANAGER", "ATTENDANT"];

export function parseRole(headers: Headers): UserRole {
  const raw = headers.get("x-role")?.toUpperCase();
  if (raw && allowedRoles.includes(raw as UserRole)) {
    return raw as UserRole;
  }
  if (process.env.DEFAULT_ROLE && allowedRoles.includes(process.env.DEFAULT_ROLE as UserRole)) {
    return process.env.DEFAULT_ROLE as UserRole;
  }
  return "OWNER";
}

export function parseTenant(headers: Headers): string | null {
  const headerTenant = headers.get("x-tenant-id");
  if (headerTenant?.length) return headerTenant;
  if (process.env.DEFAULT_TENANT_ID) return process.env.DEFAULT_TENANT_ID;
  return null;
}

export function isAllowed(role: UserRole, allowed: UserRole[]) {
  return allowed.includes(role);
}
