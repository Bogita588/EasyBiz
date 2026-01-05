import Link from "next/link";
import styles from "./profile.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomerProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();

  const customer = await prisma.customer.findUnique({
    where: { id, tenantId },
    include: {
      invoices: {
        orderBy: { issuedAt: "desc" },
        take: 10,
      },
    },
  });

  if (!customer) {
    return (
      <div className={styles.screen}>
        <p className={styles.status}>Customer not found.</p>
      </div>
    );
  }

  const paid = customer.invoices.filter((inv) => inv.status === "PAID").length;
  const waiting = customer.invoices.filter(
    (inv) => inv.status !== "PAID",
  ).length;
  const owed = customer.invoices
    .filter((inv) => inv.status !== "PAID")
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Customer</p>
          <h1 className={styles.title}>{customer.name}</h1>
          <p className={styles.meta}>
            {customer.phone || "No phone"} • {customer.priceTier}
          </p>
        </div>
        <Link href="/invoice/new" className={styles.primary}>
          New invoice
        </Link>
      </header>

      <section className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Outstanding</p>
            <p className={styles.value}>{formatCurrencyKES(owed)}</p>
          </div>
          <div>
            <p className={styles.label}>Paid</p>
            <p className={styles.value}>{paid}</p>
          </div>
          <div>
            <p className={styles.label}>Waiting</p>
            <p className={styles.value}>{waiting}</p>
          </div>
        </div>
        <p className={styles.helper}>Nature of transactions: invoices only for now.</p>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Recent invoices</p>
        <div className={styles.list}>
          {customer.invoices.map((inv) => (
            <Link
              key={inv.id}
              href={`/invoice/${inv.id}`}
              className={styles.invoiceRow}
            >
              <div>
                <p className={styles.invId}>{inv.id}</p>
                <p className={styles.invMeta}>{inv.status}</p>
              </div>
              <p className={styles.invAmount}>
                {formatCurrencyKES(Number(inv.total || 0))}
              </p>
            </Link>
          ))}
          {customer.invoices.length === 0 && (
            <p className={styles.helper}>No invoices yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
