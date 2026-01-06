import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const tenantId = parseTenant(request.headers);
    if (!tenantId) {
      return NextResponse.json({ status: "UNKNOWN" });
    }
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { status: true },
    });
    return NextResponse.json({ status: tenant?.status || "UNKNOWN" });
  } catch (error) {
    console.error("[GET /api/tenant/status]", error);
    return NextResponse.json({ status: "UNKNOWN" });
  }
}
