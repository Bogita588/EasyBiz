import Link from "next/link";
import styles from "./invoices.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { InvoicesListClient } from "@/components/invoices-list-client";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const tenantId = await getTenantId();
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { issuedAt: "desc" },
    include: { customer: { select: { name: true } } },
    take: 20,
  });
  const customers = await prisma.customer.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const initialInvoices = invoices.map((inv) => ({
    id: inv.id,
    customerName: inv.customer?.name || "Walk-in customer",
    total: Number(inv.total || 0),
    status: inv.status,
  }));

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Invoices</p>
          <h1 className={styles.title}>Recent</h1>
        </div>
        <Link href="/invoice/new" className={styles.primary}>
          New invoice
        </Link>
      </header>

      <InvoicesListClient
        initialInvoices={initialInvoices}
        customers={customers}
      />
    </div>
  );
}
