import styles from "./admin.module.css";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      businessType: true,
      createdAt: true,
      users: { select: { id: true, role: true } },
      invoices: { select: { id: true } },
      purchaseOrders: { select: { id: true, paidAt: true } },
    },
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h1 className={styles.title}>Tenant console</h1>
          <p className={styles.subtitle}>Audit tenants, users, invoices, and supplier orders.</p>
        </div>
      </header>

      <div className={styles.list}>
        {tenants.map((tenant) => {
          const invoices = tenant.invoices.length;
          const pos = tenant.purchaseOrders.length;
          const openPos = tenant.purchaseOrders.filter((po) => !po.paidAt).length;
          return (
            <article key={tenant.id} className={styles.card}>
              <div>
                <p className={styles.name}>{tenant.name}</p>
                <p className={styles.meta}>
                  {tenant.businessType || "Unknown type"} • Created{" "}
                  {tenant.createdAt.toISOString().slice(0, 10)}
                </p>
                <p className={styles.meta}>Users: {tenant.users.length}</p>
              </div>
              <div className={styles.stats}>
                <div>
                  <p className={styles.label}>Invoices</p>
                  <p className={styles.value}>{invoices}</p>
                </div>
                <div>
                  <p className={styles.label}>POs</p>
                  <p className={styles.value}>
                    {pos} ({openPos} open)
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
