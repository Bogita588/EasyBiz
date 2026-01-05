import Link from "next/link";
import styles from "./supplier.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import { SupplierPOForm } from "@/components/supplier-po-form";

export const dynamic = "force-dynamic";

export default async function SupplierProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();
  const supplier = await prisma.supplier.findUnique({
    where: { id, tenantId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      items: {
        select: {
          name: true,
          id: true,
          price: true,
          stockQuantity: true,
        },
      },
    },
  });

  if (!supplier) {
    return (
      <div className={styles.screen}>
        <p className={styles.status}>Supplier not found.</p>
      </div>
    );
  }

  const outstanding = supplier.orders.filter((po) => !po.paidAt);
  const owed = outstanding.reduce((sum, po) => sum + Number(po.total || 0), 0);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Supplier</p>
          <h1 className={styles.title}>{supplier.name}</h1>
          <p className={styles.meta}>
            {supplier.phone || supplier.whatsapp || supplier.email || "No contact saved"}
          </p>
        </div>
        <Link href="/inventory" className={styles.primary}>
          Create PO
        </Link>
      </header>

      <section className={styles.card}>
        <SupplierPOForm
          supplierId={supplier.id}
          supplierName={supplier.name}
          items={supplier.items.map((i) => ({
            id: i.id,
            name: i.name,
            price: Number(i.price),
            stockQuantity: i.stockQuantity,
          }))}
        />
      </section>

      <section className={styles.card}>
        <div className={styles.row}>
          <div>
            <p className={styles.label}>Outstanding</p>
            <p className={styles.value}>{formatCurrencyKES(owed)}</p>
          </div>
          <div>
            <p className={styles.label}>Open orders</p>
            <p className={styles.value}>{outstanding.length}</p>
          </div>
        </div>
        <p className={styles.helper}>
          Items from this supplier: {supplier.items.map((i) => i.name).join(", ") || "None"}
        </p>
        <div className={styles.actions}>
          {supplier.whatsapp && (
            <a
              className={styles.shareButton}
              href={`https://wa.me/${supplier.whatsapp}?text=${encodeURIComponent(
                `Hi ${supplier.name}, following up on open orders.`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
          {supplier.email && (
            <a
              className={styles.shareButton}
              href={`mailto:${supplier.email}?subject=Orders&body=${encodeURIComponent(
                `Hi ${supplier.name},\n\nWe have open orders pending. Please advise.`,
              )}`}
            >
              Email
            </a>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Recent purchase orders</p>
        <div className={styles.list}>
          {supplier.orders.map((po) => (
            <div key={po.id} className={styles.poRow}>
              <div>
                <p className={styles.poId}>{po.id}</p>
                <p className={styles.poMeta}>
                  Status: {po.status} {po.paidAt ? "• Paid" : ""}
                </p>
              </div>
              <p className={styles.poAmount}>{formatCurrencyKES(Number(po.total || 0))}</p>
            </div>
          ))}
          {supplier.orders.length === 0 && (
            <p className={styles.helper}>No orders yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
