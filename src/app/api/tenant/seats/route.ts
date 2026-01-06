import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseRole, parseTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const tenantId = parseTenant(request.headers);
  if (!tenantId) {
    return NextResponse.json({ enabled: false, requested: false }, { status: 401 });
  }
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userSeatsEnabled: true, userSeatsRequested: true },
    });
    return NextResponse.json({
      enabled: Boolean(tenant?.userSeatsEnabled),
      requested: Boolean(tenant?.userSeatsRequested),
    });
  } catch (error) {
    console.error("[GET /api/tenant/seats]", error);
    return NextResponse.json({ enabled: false, requested: false }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const tenantId = parseTenant(request.headers);
  const role = parseRole(request.headers);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant." }, { status: 401 });
  }
  if (role !== "OWNER") {
    return NextResponse.json({ error: "Only owners can request seats." }, { status: 403 });
  }

  try {
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { userSeatsRequested: true },
      select: { id: true, userSeatsRequested: true },
    });

    return NextResponse.json({
      requested: tenant.userSeatsRequested,
      message: "Request sent to admin.",
    });
  } catch (error) {
    console.error("[POST /api/tenant/seats]", error);
    return NextResponse.json({ error: "Could not send request." }, { status: 500 });
  }
}
