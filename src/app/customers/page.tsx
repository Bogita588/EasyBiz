import Link from "next/link";
import styles from "./customers.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const tenantId = await getTenantId();
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      invoices: {
        select: { status: true, total: true },
      },
    },
  });

  const enriched = customers.map((customer) => {
    const paid = customer.invoices.filter((inv) => inv.status === "PAID").length;
    const waiting = customer.invoices.filter(
      (inv) => inv.status !== "PAID",
    ).length;
    const owed = customer.invoices
      .filter((inv) => inv.status !== "PAID")
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    return { ...customer, paid, waiting, owed };
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Customers</p>
          <h1 className={styles.title}>People you bill</h1>
        </div>
        <Link href="/invoice/new" className={styles.primary}>
          New invoice
        </Link>
      </header>

      <div className={styles.list}>
        {enriched.map((customer) => (
          <Link
            href={`/customers/${customer.id}`}
            key={customer.id}
            className={styles.card}
          >
            <div>
              <p className={styles.name}>{customer.name}</p>
              <p className={styles.meta}>
                Paid {customer.paid} • Waiting {customer.waiting}
              </p>
            </div>
            <div className={styles.amountBlock}>
              <p className={styles.amount}>{formatCurrencyKES(customer.owed)}</p>
              <p className={styles.meta}>Owed</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
