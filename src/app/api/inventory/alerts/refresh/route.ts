import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export async function POST() {
  try {
    const tenantId = await getTenantId();
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    const lowItems = await prisma.item.findMany({
      where: {
        tenantId,
        stockQuantity: { lte: prisma.item.fields.lowStockThreshold },
      },
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
        preferredSupplier: { select: { name: true } },
      },
    });

    const events: { message: string; refId: string }[] = [];

    for (const item of lowItems) {
      const existing = await prisma.activityEvent.findFirst({
        where: {
          tenantId,
          type: "STOCK",
          refType: "item",
          refId: item.id,
          createdAt: { gte: twelveHoursAgo },
        },
        select: { id: true },
      });
      if (existing) continue;

      const supplierSuffix = item.preferredSupplier
        ? ` • Supplier: ${item.preferredSupplier.name}`
        : "";
      const message = `${item.name} is low (${item.stockQuantity}/${item.lowStockThreshold}).${supplierSuffix}`;
      events.push({ message, refId: item.id });
    }

    if (events.length > 0) {
      await prisma.activityEvent.createMany({
        data: events.map((e) => ({
          tenantId,
          type: "STOCK",
          message: e.message,
          refType: "item",
          refId: e.refId,
        })),
      });
    }

    return NextResponse.json({ created: events.length });
  } catch (error) {
    console.error("[POST /api/inventory/alerts/refresh]", error);
    return NextResponse.json(
      { error: "Could not refresh alerts." },
      { status: 500 },
    );
  }
}
