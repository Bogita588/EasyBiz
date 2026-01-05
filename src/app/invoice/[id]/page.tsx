import Link from "next/link";
import styles from "./invoice.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import { InvoiceQuickActions } from "@/components/invoice-quick-actions";
import { InvoiceShareLinks } from "@/components/invoice-share-links";

export const dynamic = "force-dynamic";

export default async function InvoiceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = await getTenantId();

  const invoice = await prisma.invoice.findUnique({
    where: { id, tenantId },
    include: {
      customer: { select: { name: true } },
      lines: true,
      payments: { select: { id: true, status: true, method: true } },
    },
  });

  if (!invoice) {
    return (
      <div className={styles.screen}>
        <p className={styles.status}>Invoice not found.</p>
      </div>
    );
  }

  const paid = invoice.status === "PAID";
  const statusLabel = paid ? "Paid" : "Waiting for payment";
  const badgeClass = paid ? styles.badgeSuccess : styles.badgeInfo;

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Invoice</p>
          <h1 className={styles.title}>{invoice.id}</h1>
          <p className={styles.subtitle}>
            {invoice.customer?.name || "Walk-in customer"}
          </p>
        </div>
        <span className={`${styles.badge} ${badgeClass}`}>{statusLabel}</span>
      </header>

      <section className={styles.card}>
        <div className={styles.rowBetween}>
          <p className={styles.label}>Total</p>
          <p className={styles.total}>{formatCurrencyKES(Number(invoice.total))}</p>
        </div>
        <p className={styles.helper}>Tax and discounts were hidden by default.</p>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Items</p>
        <div className={styles.stack}>
          {invoice.lines.map((line) => (
            <div key={line.id} className={styles.lineRow}>
              <div>
                <p className={styles.lineTitle}>{line.description}</p>
                <p className={styles.lineMeta}>
                  Qty {line.quantity} • KES {Number(line.unitPrice).toLocaleString()}
                </p>
              </div>
              <p className={styles.lineAmount}>
                KES {Number(line.lineTotal).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Actions</p>
        <InvoiceQuickActions
          invoiceId={invoice.id}
          amount={Number(invoice.total || 0)}
          status={
            invoice.status === "PAID" ? "PAID" : (invoice.status as
              | "WAITING"
              | "SENT"
              | "DRAFT"
              | "PARTIAL"
              | "CANCELLED")
          }
        />
        <Link href="/invoice/new" className={styles.ghost}>
          New invoice
        </Link>
        <InvoiceShareLinks
          invoiceId={invoice.id}
          statusText={
            paid
              ? `Invoice ${invoice.id} is paid.`
              : `Invoice ${invoice.id} is waiting for payment.`
          }
        />
      </section>

      <section className={styles.card}>
        <p className={styles.label}>Payments</p>
        <div className={styles.stack}>
          {invoice.payments.map((payment) => (
            <div key={payment.id} className={styles.paymentRow}>
              <span
                className={`${styles.badge} ${
                  payment.status === "CONFIRMED"
                    ? styles.badgeSuccess
                    : styles.badgeInfo
                }`}
              >
                {payment.method} • {payment.status}
              </span>
            </div>
          ))}
          {invoice.payments.length === 0 && (
            <p className={styles.helper}>No payments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
