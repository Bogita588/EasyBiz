import Link from "next/link";
import styles from "./supplier.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import { SupplierPOForm } from "@/components/supplier-po-form";
import { POReceiveButton } from "@/components/po-receive-button";
import type { Prisma } from "@prisma/client";
import { SupplierEditForm } from "@/components/supplier-edit-form";

type SupplierRecord = {
  id: string;
  name: string;
  phone: string | null;
  email?: string | null;
  whatsapp?: string | null;
  createdAt: Date;
  updatedAt: Date;
  orders: {
    id: string;
    status: string;
    total: Prisma.Decimal | null;
    needBy: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    paidAt: Date | null;
  }[];
  items: {
    name: string;
    id: string;
    price: Prisma.Decimal;
    stockQuantity: number;
  }[];
};

export const dynamic = "force-dynamic";

export default async function SupplierProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();
  let supplier: SupplierRecord | null = null;
  try {
    supplier = (await prisma.supplier.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        whatsapp: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            total: true,
            needBy: true,
            dueDate: true,
            createdAt: true,
            paidAt: true,
          },
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
    })) as SupplierRecord | null;
  } catch {
    // Fallback for schemas without email/whatsapp columns.
    supplier = (await prisma.supplier.findUnique({
      where: { id, tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            total: true,
            needBy: true,
            dueDate: true,
            createdAt: true,
            paidAt: true,
          },
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
    })) as SupplierRecord | null;
  }

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
        <div className={styles.contactGrid}>
          <div>
            <p className={styles.label}>Phone</p>
            <p className={styles.value}>{supplier.phone || "Not saved"}</p>
          </div>
          {"email" in supplier && (
            <div>
              <p className={styles.label}>Email</p>
              <p className={styles.value}>{(supplier as { email?: string | null }).email || "Not saved"}</p>
            </div>
          )}
          {"whatsapp" in supplier && (
            <div>
              <p className={styles.label}>WhatsApp</p>
              <p className={styles.value}>{(supplier as { whatsapp?: string | null }).whatsapp || "Not saved"}</p>
            </div>
          )}
          <div>
            <p className={styles.label}>Since</p>
            <p className={styles.value}>
              {new Date(supplier.createdAt).toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
        <div className={styles.actions}>
          {supplier.phone && (
            <a className={styles.shareButton} href={`tel:${supplier.phone}`}>
              Call supplier
            </a>
          )}
          {"whatsapp" in supplier && (supplier as { whatsapp?: string | null }).whatsapp && (
            <a
              className={styles.shareButton}
              href={`https://wa.me/${(supplier as { whatsapp?: string | null }).whatsapp}`}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
          )}
          {"email" in supplier && (supplier as { email?: string | null }).email && (
            <a
              className={styles.shareButton}
              href={`mailto:${(supplier as { email?: string | null }).email}`}
            >
              Email
            </a>
          )}
        </div>
      </section>

      <section className={styles.card}>
        <SupplierEditForm
          supplierId={supplier.id}
          initial={{
            name: supplier.name,
            phone: supplier.phone,
            email: "email" in supplier ? (supplier as { email?: string | null }).email : null,
            whatsapp: "whatsapp" in supplier ? (supplier as { whatsapp?: string | null }).whatsapp : null,
          }}
        />
      </section>

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
          contact={{
            phone: supplier.phone,
            email: "email" in supplier ? (supplier as { email?: string | null }).email : null,
            whatsapp: "whatsapp" in supplier ? (supplier as { whatsapp?: string | null }).whatsapp : null,
          }}
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
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Recent purchase orders</p>
        <div className={styles.list}>
          {supplier.orders.map((po) => (
            <div key={po.id} className={styles.poRow}>
              <div>
            <p className={styles.poId}>{po.id}</p>
            <p className={styles.poMeta}>
                  Status: <span className={styles.statusPill}>{po.status}</span>{" "}
                  {po.paidAt ? `• Received ${new Date(po.paidAt).toISOString().slice(0, 10)}` : "• Not paid"}
                  {po.needBy && ` • Need by ${new Date(po.needBy).toISOString().slice(0, 10)}`}
                  {po.dueDate && ` • Due ${new Date(po.dueDate).toISOString().slice(0, 10)}`}
                  {po.needBy && !po.paidAt && new Date(po.needBy) < new Date() && " • Overdue for delivery"}
            </p>
          </div>
          <p className={styles.poAmount}>{formatCurrencyKES(Number(po.total || 0))}</p>
          <div className={styles.poActions}>
            {!po.paidAt && (
                  <POReceiveButton poId={po.id} />
                )}
              </div>
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
