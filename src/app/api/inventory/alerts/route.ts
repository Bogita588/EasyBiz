import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { ensureStockEvents } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const items = await prisma.item.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
        preferredSupplier: { select: { id: true, name: true } },
      },
      orderBy: { stockQuantity: "asc" },
    });

    await ensureStockEvents(tenantId, items);

    const alerts = items
      .filter((item) => item.stockQuantity <= item.lowStockThreshold)
      .map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stockQuantity,
        threshold: item.lowStockThreshold,
        suggestedQty: Math.max(
          item.lowStockThreshold * 2 - item.stockQuantity,
          5,
        ),
        supplier: item.preferredSupplier
          ? { id: item.preferredSupplier.id, name: item.preferredSupplier.name }
          : null,
      }));

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("[GET /api/inventory/alerts]", error);
    return NextResponse.json(
      { error: "Could not load inventory alerts." },
      { status: 500 },
    );
  }
}
