import styles from "./money.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MoneyPage() {
  const tenantId = await getTenantId();
  const { profitWeek, revenue, costs } = await getProfitThisWeek(tenantId);
  const receivables = await getReceivables(tenantId);
  const cash = await getCash(tenantId);
  const payables = await getPayables(tenantId);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Money</p>
          <h1 className={styles.title}>Quick answers</h1>
          <p className={styles.subtitle}>Did I make money? Who owes me? Cash on hand.</p>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <p className={styles.label}>Did I make money this week?</p>
          <p className={styles.value}>{formatCurrencyKES(profitWeek)}</p>
          <p className={styles.meta}>
            Revenue {formatCurrencyKES(revenue)} • Costs {formatCurrencyKES(costs)}
          </p>
        </article>

        <article className={styles.card}>
          <p className={styles.label}>Who owes me?</p>
          <p className={styles.value}>{formatCurrencyKES(receivables.total)}</p>
          <p className={styles.meta}>
            Top: {receivables.topDebtors.map((d) => `${d.name} (${formatCurrencyKES(d.amount)})`).join(", ") || "None"}
          </p>
        </article>

        <article className={styles.card}>
          <p className={styles.label}>Cash on hand / M-Pesa</p>
          <p className={styles.value}>
            {formatCurrencyKES(cash.cash + cash.mpesa)}
          </p>
          <p className={styles.meta}>
            Cash {formatCurrencyKES(cash.cash)} • M-Pesa {formatCurrencyKES(cash.mpesa)}
          </p>
        </article>

        <article className={styles.card}>
          <p className={styles.label}>Owed to suppliers</p>
          <p className={styles.value}>{formatCurrencyKES(payables.total)}</p>
          <p className={styles.meta}>
            Top: {payables.topSuppliers.map((s) => `${s.name} (${formatCurrencyKES(s.amount)})`).join(", ") || "None"}
          </p>
        </article>
      </div>
    </div>
  );
}

async function getProfitThisWeek(tenantId: string) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 7);
  const payments = await prisma.payment.aggregate({
    where: { tenantId, status: "CONFIRMED", confirmedAt: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const revenue = Number(payments._sum.amount || 0);
  const costs = 0;
  return { profitWeek: revenue - costs, revenue, costs };
}

async function getReceivables(tenantId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, status: { not: "PAID" } },
    select: { total: true, customer: { select: { name: true } } },
  });
  const total = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const topDebtors = invoices
    .reduce<Record<string, number>>((map, inv) => {
      const name = inv.customer?.name || "Customer";
      map[name] = (map[name] || 0) + Number(inv.total || 0);
      return map;
    }, {});
  const sorted = Object.entries(topDebtors)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));
  return { total, topDebtors: sorted };
}

async function getCash(tenantId: string) {
  const payments = await prisma.payment.groupBy({
    by: ["method"],
    _sum: { amount: true },
    where: { tenantId, status: "CONFIRMED" },
  });
  const cash = payments
    .filter((p) => p.method === "CASH")
    .reduce((sum, p) => sum + Number(p._sum.amount || 0), 0);
  const mpesa = payments
    .filter((p) =>
      ["MPESA_TILL", "MPESA_PAYBILL", "MPESA_POCHI"].includes(p.method),
    )
    .reduce((sum, p) => sum + Number(p._sum.amount || 0), 0);
  return { cash, mpesa };
}

async function getPayables(tenantId: string) {
  const pos = await prisma.purchaseOrder.findMany({
    where: { tenantId, paidAt: null },
    select: { total: true, supplier: { select: { name: true } } },
  });
  const total = pos.reduce((sum, po) => sum + Number(po.total || 0), 0);
  const grouped = pos.reduce<Record<string, number>>((map, po) => {
    const name = po.supplier?.name || "Supplier";
    map[name] = (map[name] || 0) + Number(po.total || 0);
    return map;
  }, {});
  const topSuppliers = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));
  return { total, topSuppliers };
}
