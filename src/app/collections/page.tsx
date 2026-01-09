import styles from "./collections.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { CollectionForm } from "@/components/collection-form";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const tenantId = await getTenantId();
  const collections = await prisma.payment.findMany({
    where: { tenantId, invoiceId: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      method: true,
      amount: true,
      status: true,
      confirmedAt: true,
      createdAt: true,
      mpesaReceipt: true,
    },
  });
  const total = collections.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Collections</p>
          <h1 className={styles.title}>Walk-in & counter payments</h1>
          <p className={styles.subtitle}>Record money collected outside invoicing (cash or M-Pesa).</p>
        </div>
        <div className={styles.totalBlock}>
          <p className={styles.label}>Last 50 total</p>
          <p className={styles.total}>{formatCurrencyKES(total)}</p>
        </div>
      </header>

      <div className={styles.grid}>
        <div className={styles.card}>
          <CollectionForm />
        </div>
        <div className={styles.card}>
          <p className={styles.label}>Recent collections</p>
          <div className={styles.list}>
            {collections.map((c) => (
              <div key={c.id} className={styles.row}>
                <div>
                  <p className={styles.amount}>{formatCurrencyKES(Number(c.amount || 0))}</p>
                  <p className={styles.meta}>
                    {c.method.replace("MPESA_", "M-Pesa ")} • {new Date(c.confirmedAt || c.createdAt).toLocaleString()}
                  </p>
                  {c.mpesaReceipt && <p className={styles.meta}>Note: {c.mpesaReceipt}</p>}
                </div>
                <span className={styles.pill}>{c.status}</span>
              </div>
            ))}
            {collections.length === 0 && <p className={styles.meta}>No collections yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
