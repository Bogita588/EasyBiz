import Link from "next/link";
import styles from "./invoices.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const tenantId = await getTenantId();
  const invoices = await prisma.invoice.findMany({
    where: { tenantId },
    orderBy: { issuedAt: "desc" },
    include: { customer: { select: { name: true } } },
    take: 20,
  });

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

      <div className={styles.list}>
        {invoices.map((invoice) => (
          <article key={invoice.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <p className={styles.invoiceId}>{invoice.id}</p>
                <p className={styles.customer}>
                  {invoice.customer?.name || "Walk-in customer"}
                </p>
              </div>
              <span
                className={`${styles.badge} ${
                  invoice.status === "PAID"
                    ? styles.badgeSuccess
                    : styles.badgeInfo
                }`}
              >
                {invoice.status === "PAID" ? "Paid" : "Waiting"}
              </span>
            </div>
            <div className={styles.rowBetween}>
              <p className={styles.amount}>
                {formatCurrencyKES(Number(invoice.total))}
              </p>
              <div className={styles.actions}>
                {invoice.status !== "PAID" && (
                  <>
                    <form
                      action={`/api/payments/mpesa/request`}
                      method="POST"
                      className={styles.inlineForm}
                    >
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input
                        type="hidden"
                        name="amount"
                        value={Number(invoice.total)}
                      />
                      <button type="submit" className={styles.linkButton}>
                        Request M-Pesa
                      </button>
                    </form>
                    <form
                      action={`/api/invoices/${invoice.id}/mark-paid`}
                      method="POST"
                      className={styles.inlineForm}
                    >
                      <input type="hidden" name="_method" value="PATCH" />
                      <button type="submit" className={styles.linkButton}>
                        Mark paid
                      </button>
                    </form>
                  </>
                )}
                <Link href={`/invoice/${invoice.id}`} className={styles.ghost}>
                  View
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
