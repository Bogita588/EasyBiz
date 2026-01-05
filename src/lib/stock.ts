import { prisma } from "./prisma";

export async function ensureStockEvents(
  tenantId: string,
  items: {
    id: string;
    name: string;
    stockQuantity: number;
    lowStockThreshold: number;
    preferredSupplier?: { name: string } | null;
  }[],
) {
  const now = new Date();
  const windowStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);

  const lowItems = items.filter(
    (item) => item.stockQuantity <= item.lowStockThreshold,
  );

  const needsEvent: { id: string; message: string }[] = [];

  for (const item of lowItems) {
    const existing = await prisma.activityEvent.findFirst({
      where: {
        tenantId,
        type: "STOCK",
        refType: "item",
        refId: item.id,
        createdAt: { gte: windowStart },
      },
      select: { id: true },
    });
    if (existing) continue;

    const supplierSuffix = item.preferredSupplier
      ? ` • Supplier: ${item.preferredSupplier.name}`
      : "";
    const message = `${item.name} is low (${item.stockQuantity}/${item.lowStockThreshold}).${supplierSuffix}`;
    needsEvent.push({ id: item.id, message });
  }

  if (needsEvent.length) {
    await prisma.activityEvent.createMany({
      data: needsEvent.map((ev) => ({
        tenantId,
        type: "STOCK",
        message: ev.message,
        refType: "item",
        refId: ev.id,
      })),
    });
  }
}
