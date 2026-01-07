import { NextRequest, NextResponse } from "next/server";
import { runWithTenant } from "@/lib/tenant-context";
import { parseTenant } from "@/lib/auth";

export async function withTenantContext(request: NextRequest, handler: () => Promise<NextResponse>) {
  const tenantId = parseTenant(request.headers);
  return runWithTenant(tenantId, handler);
}
