import styles from "./daily-report.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DailyReportPage() {
  const tenantId = await getTenantId();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  const payments = await prisma.payment.findMany({
    where: { tenantId, confirmedAt: { gte: start, lt: end } },
    select: { amount: true, method: true },
  });
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, issuedAt: { gte: start, lt: end } },
    select: {
      id: true,
      status: true,
      total: true,
      customer: { select: { name: true } },
      lines: { select: { description: true, quantity: true } },
    },
    orderBy: { issuedAt: "desc" },
  });
  const pos = await prisma.purchaseOrder.findMany({
    where: { tenantId, createdAt: { gte: start, lt: end } },
    select: {
      id: true,
      total: true,
      needBy: true,
      dueDate: true,
      supplier: { select: { name: true } },
      lines: { select: { quantity: true, item: { select: { name: true } } } },
      status: true,
    },
    orderBy: { createdAt: "desc" },
  });
  const receivables = await prisma.invoice.aggregate({
    where: { tenantId, status: { not: "PAID" } },
    _sum: { total: true },
  });
  const payables = await prisma.purchaseOrder.aggregate({
    where: { tenantId, paidAt: null },
    _sum: { total: true },
  });
  const lowStockRaw = await prisma.item.findMany({
    where: { tenantId },
    select: {
      name: true,
      stockQuantity: true,
      lowStockThreshold: true,
      preferredSupplier: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const lowStock = lowStockRaw.filter((i) => i.stockQuantity <= i.lowStockThreshold);
  const paymentByMethod = payments.reduce<Record<string, number>>((acc, p) => {
    const key = p.method;
    acc[key] = (acc[key] || 0) + Number(p.amount || 0);
    return acc;
  }, {});

  const paymentTotal = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Reports</p>
          <h1 className={styles.title}>Today&apos;s business report</h1>
          <p className={styles.subtitle}>Invoices, payments, and supplier orders for today.</p>
        </div>
        <div className={styles.actions}>
          <a className={styles.primary} href="/api/reports/daily/pdf">
            Download PDF
          </a>
          <a className={styles.secondary} href="/api/reports/daily">
            CSV
          </a>
        </div>
      </header>

      <section className={styles.cards}>
        <article className={styles.card}>
          <p className={styles.label}>Payments collected</p>
          <p className={styles.value}>{formatCurrencyKES(paymentTotal)}</p>
          <p className={styles.meta}>
            Methods:{" "}
            {payments
              .map((p) => `${p.method} ${formatCurrencyKES(Number(p.amount || 0))}`)
              .join(", ") || "None"}
          </p>
        </article>
        <article className={styles.card}>
          <p className={styles.label}>Receivables (owed to you)</p>
          <p className={styles.value}>{formatCurrencyKES(Number(receivables._sum.total || 0))}</p>
          <p className={styles.meta}>Outstanding invoices across customers.</p>
        </article>
        <article className={styles.card}>
          <p className={styles.label}>Payables (suppliers)</p>
          <p className={styles.value}>{formatCurrencyKES(Number(payables._sum.total || 0))}</p>
          <p className={styles.meta}>{pos.filter((po) => po.status !== "RECEIVED").length} open POs</p>
        </article>
        <article className={styles.card}>
          <p className={styles.label}>Low-stock items</p>
          <p className={styles.value}>{lowStock.length}</p>
          <p className={styles.meta}>Items at/below threshold</p>
        </article>
      </section>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Payments breakdown</h2>
        </div>
        <div className={styles.list}>
          {Object.entries(paymentByMethod).map(([method, amt]) => (
            <div key={method} className={styles.row}>
              <p className={styles.rowTitle}>{method}</p>
              <p className={styles.rowValue}>{formatCurrencyKES(amt)}</p>
            </div>
          ))}
          {!Object.keys(paymentByMethod).length && <p className={styles.meta}>No payments today.</p>}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Invoices</h2>
        </div>
        <div className={styles.list}>
          {invoices.map((inv) => {
            const firstLine = inv.lines[0];
            const lineText = firstLine
              ? `${firstLine.quantity} × ${firstLine.description}`
              : "No lines";
            return (
              <div key={inv.id} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>{inv.customer?.name || "Customer"}</p>
                  <p className={styles.rowMeta}>
                    {lineText} • {inv.status}
                  </p>
                </div>
                <p className={styles.rowValue}>{formatCurrencyKES(Number(inv.total || 0))}</p>
              </div>
            );
          })}
          {invoices.length === 0 && (
            <p className={styles.meta}>No invoices issued today.</p>
          )}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Supplier orders</h2>
        </div>
        <div className={styles.list}>
          {pos.map((po) => {
            const line = po.lines[0];
            const lineText = line?.item?.name
              ? `${line.quantity} × ${line.item.name}`
              : "Order";
            return (
              <div key={po.id} className={styles.row}>
                <div>
                  <p className={styles.rowTitle}>
                    {po.supplier?.name || "Supplier"} • {po.status}
                  </p>
                  <p className={styles.rowMeta}>
                    {lineText}
                    {po.needBy && ` • Need by ${po.needBy.toISOString().slice(0, 10)}`}
                    {po.dueDate && ` • Due ${po.dueDate.toISOString().slice(0, 10)}`}
                  </p>
                </div>
                <p className={styles.rowValue}>{formatCurrencyKES(Number(po.total || 0))}</p>
              </div>
            );
          })}
          {pos.length === 0 && <p className={styles.meta}>No purchase orders today.</p>}
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>Low-stock alerts</h2>
        </div>
        <div className={styles.list}>
          {lowStock.map((item) => (
            <div key={item.name} className={styles.row}>
              <div>
                <p className={styles.rowTitle}>{item.name}</p>
                <p className={styles.rowMeta}>
                  In stock {item.stockQuantity} / low at {item.lowStockThreshold}
                  {item.preferredSupplier ? ` • Supplier ${item.preferredSupplier.name}` : ""}
                </p>
              </div>
            </div>
          ))}
          {lowStock.length === 0 && <p className={styles.meta}>No low-stock items.</p>}
        </div>
      </section>
    </div>
  );
}
