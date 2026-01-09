import Link from "next/link";
import styles from "./suppliers.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import { SupplierForm } from "@/components/supplier-form";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const tenantId = await getTenantId();
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: {
      orders: {
        select: { status: true, total: true, paidAt: true, paidAmount: true },
      },
      _count: { select: { orders: true } },
    },
  });

  const enriched = suppliers.map((s) => {
    const payables = s.orders
      .filter((po) => !po.paidAt)
      .reduce((sum, po) => sum + Math.max(0, Number(po.total || 0) - Number(po.paidAmount || 0)), 0);
    return { ...s, payables };
  });

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Suppliers</p>
          <h1 className={styles.title}>Partners you order from</h1>
        </div>
        <Link href="/inventory" className={styles.primary}>
          Create PO
        </Link>
      </header>

      <div className={styles.card}>
        <SupplierForm />
      </div>

      <div className={styles.list}>
        {enriched.map((supplier) => (
          <Link
            key={supplier.id}
            href={`/suppliers/${supplier.id}`}
            className={styles.card}
          >
            <div>
              <p className={styles.name}>{supplier.name}</p>
              <p className={styles.meta}>
                {supplier.phone || supplier.whatsapp || supplier.email || "No contact saved"}
              </p>
            </div>
            <div className={styles.amountBlock}>
              <p className={styles.amount}>{formatCurrencyKES(supplier.payables)}</p>
              <p className={styles.meta}>Owed</p>
            </div>
          </Link>
        ))}
        {suppliers.length === 0 && (
          <p className={styles.meta}>No suppliers yet. Add via inventory or API.</p>
        )}
      </div>
    </div>
  );
}
