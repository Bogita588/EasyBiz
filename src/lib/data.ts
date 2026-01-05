import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureStockEvents } from "./stock";

export async function getTenantId() {
  if (process.env.DEFAULT_TENANT_ID) return process.env.DEFAULT_TENANT_ID;
  const first = await prisma.tenant.findFirst({ select: { id: true } });
  if (!first) {
    throw new Error("No tenant found. Seed the database first.");
  }
  return first.id;
}

export async function getSummary() {
  const tenantId = await getTenantId();
  const { start, end } = todayRange();

  const payments = await prisma.payment.groupBy({
    by: ["method"],
    _sum: { amount: true },
    where: {
      tenantId,
      status: "CONFIRMED",
      createdAt: { gte: start, lt: end },
    },
  });

  const cashToday = sumByMethods(payments, ["CASH"]);
  const mpesaToday = sumByMethods(payments, [
    "MPESA_TILL",
    "MPESA_PAYBILL",
    "MPESA_POCHI",
  ]);
  const soldToday = cashToday + mpesaToday;

  const owedAgg = await prisma.invoice.aggregate({
    where: { tenantId, NOT: { status: "PAID" } },
    _sum: { total: true },
  });
  const owed = numberFromDecimal(owedAgg._sum.total);

  const payablesAgg = await prisma.purchaseOrder.aggregate({
    where: { tenantId, paidAt: null },
    _sum: { total: true },
  });
  const payables = numberFromDecimal(payablesAgg._sum.total);

  const lowStockItems = await prisma.item.findMany({
    where: { tenantId },
    select: { stockQuantity: true, lowStockThreshold: true },
  });
  const lowStockCount = lowStockItems.filter(
    (item) => item.stockQuantity <= item.lowStockThreshold,
  ).length;

  const summaryText = `Today you collected KES ${soldToday.toLocaleString()}. You are owed KES ${owed.toLocaleString()}. You owe suppliers KES ${payables.toLocaleString()}. ${lowStockCount} items are low in stock.`;

  return {
    summaryText,
    soldToday,
    cashToday,
    mpesaToday,
    owed,
    payables,
    lowStockCount,
  };
}

export async function getFeed(limit = 10) {
  const tenantId = await getTenantId();
  const events = await prisma.activityEvent.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return events.map((event) => ({
    id: event.id,
    type: event.type,
    text: event.message,
    ts: event.createdAt.toISOString(),
  }));
}

function sumByMethods(
  rows: { method: string; _sum: { amount: Prisma.Decimal | null } }[],
  methods: string[],
) {
  return rows
    .filter((row) => methods.includes(row.method))
    .reduce((acc, row) => acc + numberFromDecimal(row._sum.amount), 0);
}

function numberFromDecimal(value: Prisma.Decimal | null | undefined) {
  if (!value) return 0;
  return Number(value);
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

export async function getLowStockAlerts() {
  try {
    const tenantId = await getTenantId();
    let items;
    try {
      items = await prisma.item.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          lowStockThreshold: true,
          preferredSupplier: {
            select: { id: true, name: true, phone: true, email: true, whatsapp: true },
          },
        },
      });
    } catch {
      // Fallback for older schemas without supplier contact fields.
      items = await prisma.item.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          lowStockThreshold: true,
          preferredSupplier: { select: { id: true, name: true } },
        },
      });
    }

    await ensureStockEvents(tenantId, items);

    return items
      .filter((item) => item.stockQuantity <= item.lowStockThreshold)
      .map((item) => ({
        id: item.id,
        name: item.name,
        stock: item.stockQuantity,
        threshold: item.lowStockThreshold,
        supplier: item.preferredSupplier
          ? {
              id: item.preferredSupplier.id,
              name: item.preferredSupplier.name,
              phone:
                "phone" in item.preferredSupplier
                  ? (item.preferredSupplier as { phone?: string | null }).phone ?? null
                  : null,
              email:
                "email" in item.preferredSupplier
                  ? (item.preferredSupplier as { email?: string | null }).email ?? null
                  : null,
              whatsapp:
                "whatsapp" in item.preferredSupplier
                  ? (item.preferredSupplier as { whatsapp?: string | null }).whatsapp ?? null
                  : null,
            }
          : null,
        suggestedQty: Math.max(item.lowStockThreshold * 2 - item.stockQuantity, 5),
      }));
  } catch (error) {
    console.error("[getLowStockAlerts]", error);
    return [];
  }
}
