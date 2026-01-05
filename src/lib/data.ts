import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

  const lowStockItems = await prisma.item.findMany({
    where: { tenantId },
    select: { stockQuantity: true, lowStockThreshold: true },
  });
  const lowStockCount = lowStockItems.filter(
    (item) => item.stockQuantity <= item.lowStockThreshold,
  ).length;

  const summaryText = `Today you collected KES ${soldToday.toLocaleString()}. You are owed KES ${owed.toLocaleString()}. ${lowStockCount} items are low in stock.`;

  return {
    summaryText,
    soldToday,
    cashToday,
    mpesaToday,
    owed,
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
