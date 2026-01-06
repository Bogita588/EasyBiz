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
  const customerPayments = await getRecentCustomerPayments(tenantId);
  const supplierPayments = await getSupplierPayments(tenantId);

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

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Customer payments</h2>
          <span className={styles.panelHint}>Latest receipts</span>
        </div>
        <div className={styles.list}>
          {customerPayments.map((p) => (
            <div key={p.id} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{p.customer || "Customer"}</p>
                <p className={styles.rowMeta}>
                  {p.method} • {p.time}
                </p>
              </div>
              <p className={styles.rowValue}>{formatCurrencyKES(p.amount)}</p>
            </div>
          ))}
          {customerPayments.length === 0 && (
            <p className={styles.meta}>No recent payments.</p>
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Supplier payments</h2>
          <span className={styles.panelHint}>Full or partial</span>
        </div>
        <div className={styles.list}>
          {supplierPayments.map((p) => (
            <div key={p.id} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{p.supplier || "Supplier"}</p>
                <p className={styles.rowMeta}>
                  {p.status} • {p.time}
                </p>
                <p className={styles.rowMeta}>
                  Paid {formatCurrencyKES(p.paid)} / {formatCurrencyKES(p.total)}
                </p>
              </div>
              <p className={styles.rowValue}>{formatCurrencyKES(p.paid)}</p>
            </div>
          ))}
          {supplierPayments.length === 0 && (
            <p className={styles.meta}>No supplier payments yet.</p>
          )}
        </div>
      </section>
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
    where: { tenantId },
    select: { total: true, paidAmount: true, supplier: { select: { name: true } } },
  });
  const outstandingList = pos.map((po) => {
    const total = Number(po.total || 0);
    const paid = Number(po.paidAmount || 0);
    return { supplier: po.supplier?.name || "Supplier", outstanding: Math.max(0, total - paid) };
  });
  const total = outstandingList.reduce((sum, po) => sum + po.outstanding, 0);
  const grouped = outstandingList.reduce<Record<string, number>>((map, po) => {
    const name = po.supplier;
    map[name] = (map[name] || 0) + po.outstanding;
    return map;
  }, {});
  const topSuppliers = Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount]) => ({ name, amount }));
  return { total, topSuppliers };
}

async function getRecentCustomerPayments(tenantId: string) {
  const payments = await prisma.payment.findMany({
    where: { tenantId, status: "CONFIRMED" },
    orderBy: { confirmedAt: "desc" },
    take: 10,
    select: {
      id: true,
      amount: true,
      method: true,
      confirmedAt: true,
      createdAt: true,
      invoice: { select: { customer: { select: { name: true } } } },
    },
  });
  return payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount || 0),
    method: p.method,
    customer: p.invoice?.customer?.name,
    time: (p.confirmedAt || p.createdAt).toLocaleString(),
  }));
}

async function getSupplierPayments(tenantId: string) {
  const pos = await prisma.purchaseOrder.findMany({
    where: { tenantId, paidAmount: { gt: 0 } },
    orderBy: { updatedAt: "desc" },
    take: 10,
    select: {
      id: true,
      total: true,
      paidAmount: true,
      paidAt: true,
      updatedAt: true,
      supplier: { select: { name: true } },
    },
  });

  return pos.map((po) => {
    const total = Number(po.total || 0);
    const paid = Number(po.paidAmount || 0);
    const status = paid >= total ? "Paid in full" : "Partial";
    const ts = po.paidAt || po.updatedAt;
    return {
      id: po.id,
      supplier: po.supplier?.name,
      total,
      paid,
      status,
      time: ts.toLocaleString(),
    };
  });
}
