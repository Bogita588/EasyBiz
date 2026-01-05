import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        price: true,
        wholesalePrice: true,
        stockQuantity: true,
      },
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/items]", error);
    return NextResponse.json(
      { error: "Could not load items." },
      { status: 500 },
    );
  }
}
