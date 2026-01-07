import { NextResponse } from "next/server";
import { parseRole, parseTenant, parseTenantStatus } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const role = parseRole(request.headers);
  const tenantId = parseTenant(request.headers);
  const status = parseTenantStatus(request.headers);
  return NextResponse.json({ role, tenantId, status });
}
