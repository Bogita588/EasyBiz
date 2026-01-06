import styles from "./admin.module.css";
import { prisma } from "@/lib/prisma";
import { AdminTenantForm } from "@/components/admin-tenant-form";
import { AdminStatusButtons } from "@/components/admin-status-buttons";
import { AdminDeleteButton } from "@/components/admin-delete-button";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let tenants;
  try {
    tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        businessType: true,
        createdAt: true,
        userSeatsEnabled: true,
        userSeatsRequested: true,
        users: { select: { id: true, role: true } },
        invoices: { select: { id: true } },
        purchaseOrders: { select: { id: true, paidAt: true } },
      },
    });
  } catch {
    tenants = await prisma.tenant.findMany({
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
    }).then((list) =>
      list.map((t) => ({
        ...t,
        status: "UNKNOWN",
        userSeatsEnabled: false,
        userSeatsRequested: false,
      })),
    );
  }

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Admin</p>
          <h1 className={styles.title}>Tenant console</h1>
          <p className={styles.subtitle}>Audit tenants, users, invoices, and supplier orders.</p>
        </div>
      </header>

      <AdminTenantForm />

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
                  {tenant.createdAt.toISOString().slice(0, 10)} • Status {tenant.status}
                </p>
                <p className={styles.meta}>Users: {tenant.users.length}</p>
                <p className={styles.meta}>
                  Extra users:{" "}
                  {Boolean((tenant as { userSeatsEnabled?: boolean }).userSeatsEnabled)
                    ? "Enabled"
                    : "Disabled"}
                  {" • "}
                  Request:{" "}
                  {Boolean((tenant as { userSeatsRequested?: boolean }).userSeatsRequested)
                    ? "Requested"
                    : "None"}
                </p>
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
              <AdminStatusButtons
                tenantId={tenant.id}
                initialStatus={
                  (tenant as { status?: string }).status === "ACTIVE" ||
                  (tenant as { status?: string }).status === "PENDING" ||
                  (tenant as { status?: string }).status === "SUSPENDED"
                    ? ((tenant as { status?: "ACTIVE" | "PENDING" | "SUSPENDED" }).status as
                        | "ACTIVE"
                        | "PENDING"
                        | "SUSPENDED")
                    : "UNKNOWN"
                }
                userSeatsEnabled={Boolean((tenant as { userSeatsEnabled?: boolean }).userSeatsEnabled)}
                userSeatsRequested={Boolean((tenant as { userSeatsRequested?: boolean }).userSeatsRequested)}
              />
              <AdminDeleteButton tenantId={tenant.id} />
            </article>
          );
        })}
      </div>
    </div>
  );
}
