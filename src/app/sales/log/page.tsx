import styles from "../quick/quick.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

function formatAmount(value: number) {
  return `KES ${value.toLocaleString()}`;
}

function formatWhen(d?: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export default async function SalesLogPage() {
  const tenantId = await getTenantId();
  const records = await prisma.payment.findMany({
    where: { tenantId, source: "COUNTER" },
    orderBy: { confirmedAt: "desc" },
    take: 50,
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      confirmedAt: true,
      createdAt: true,
      mpesaReceipt: true,
    },
  });

  const totalToday = records
    .filter((r) => {
      if (!r.confirmedAt) return false;
      const now = new Date();
      return (
        r.confirmedAt.getFullYear() === now.getFullYear() &&
        r.confirmedAt.getMonth() === now.getMonth() &&
        r.confirmedAt.getDate() === now.getDate()
      );
    })
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Sales</p>
          <h1 className={styles.title}>Quick sales log</h1>
          <p className={styles.subtitle}>
            Walk-in payments (cash / M-Pesa). Includes the last 50 counter sales.
          </p>
        </div>
        <div className={styles.pill}>{formatAmount(totalToday)} today</div>
      </header>

      <div className={styles.listCard}>
        {records.length === 0 && <p className={styles.empty}>No counter sales recorded yet.</p>}
        {records.map((sale) => (
          <div key={sale.id} className={styles.row}>
            <div>
              <div className={styles.pill}>{formatAmount(Number(sale.amount || 0))}</div>
              <p className={styles.note}>Method: {sale.method.replace("MPESA_", "M-Pesa ")}</p>
            </div>
            <div>
              <span className={styles.badge}>
                {sale.status === "CONFIRMED" ? "Paid" : sale.status?.toLowerCase() || "unknown"}
              </span>
              <p className={styles.note}>ID: {sale.id.slice(0, 8)}…</p>
            </div>
            <div>
              <p className={styles.note}>Time: {formatWhen(sale.confirmedAt || sale.createdAt)}</p>
            </div>
            <div>
              <p className={styles.note}>
                Details: {sale.mpesaReceipt ? sale.mpesaReceipt : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
