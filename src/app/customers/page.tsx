import Link from "next/link";
import styles from "./customers.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import { CustomerForm } from "@/components/customer-form";

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
        <div className={styles.card}>
          <CustomerForm />
        </div>
        {enriched.map((customer) => (
          <Link
            href={`/customers/${customer.id}`}
            key={customer.id}
            className={styles.card}
          >
            <div>
              <p className={styles.name}>{customer.name}</p>
              <p className={styles.meta}>
                {customer.phone || customer.email || customer.whatsapp || "No contact"} • {customer.priceTier}
              </p>
              {customer.location && <p className={styles.meta}>{customer.location}</p>}
              {customer.notes && <p className={styles.meta}>{customer.notes}</p>}
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
