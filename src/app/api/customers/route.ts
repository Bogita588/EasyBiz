import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, priceTier: true },
    });
    return NextResponse.json({ customers });
  } catch (error) {
    console.error("[GET /api/customers]", error);
    return NextResponse.json(
      { error: "Could not load customers." },
      { status: 500 },
    );
  }
}
