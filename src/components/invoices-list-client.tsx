"use client";

import Link from "next/link";
import { useState } from "react";
import { InvoiceQuickActions } from "./invoice-quick-actions";
import styles from "@/app/invoices/invoices.module.css";
import { formatCurrencyKES } from "@/lib/format";
import { InvoiceShareLinks } from "./invoice-share-links";

type InvoiceListItem = {
  id: string;
  customerName: string;
  total: number;
  status: "PAID" | "WAITING" | "SENT" | "DRAFT" | "PARTIAL" | "CANCELLED";
};

type Props = {
  initialInvoices: InvoiceListItem[];
  customers: { id: string; name: string }[];
};

export function InvoicesListClient({ initialInvoices, customers }: Props) {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>(initialInvoices);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "waiting">(
    "all",
  );
  const [customerFilter, setCustomerFilter] = useState<string>("all");

  const handleStatusChange = (id: string, status: InvoiceListItem["status"]) => {
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status } : inv)),
    );
  };

  const filtered = invoices.filter((inv) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "paid"
          ? inv.status === "PAID"
          : inv.status !== "PAID";
    const matchesCustomer =
      customerFilter === "all" ? true : inv.customerName === customerFilter;
    return matchesStatus && matchesCustomer;
  });

  return (
    <div className={styles.list}>
      <div className={styles.filters}>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "paid" | "waiting")
          }
        >
          <option value="all">All statuses</option>
          <option value="waiting">Waiting</option>
          <option value="paid">Paid</option>
        </select>
        <select
          className={styles.filterSelect}
          value={customerFilter}
          onChange={(e) => setCustomerFilter(e.target.value)}
        >
          <option value="all">All customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {filtered.map((invoice) => (
        <article key={invoice.id} className={styles.card}>
          <div className={styles.cardTop}>
            <div>
              <p className={styles.invoiceId}>{invoice.id}</p>
              <p className={styles.customer}>{invoice.customerName}</p>
            </div>
            <span
              className={`${styles.badge} ${
                invoice.status === "PAID" ? styles.badgeSuccess : styles.badgeInfo
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
              <InvoiceQuickActions
                invoiceId={invoice.id}
                amount={invoice.total}
                status={invoice.status}
                onStatusChange={(status) => handleStatusChange(invoice.id, status)}
              />
              <Link href={`/invoice/${invoice.id}`} className={styles.ghost}>
                View
              </Link>
            </div>
          </div>
          <InvoiceShareLinks
            invoiceId={invoice.id}
            statusText={
              invoice.status === "PAID"
                ? `Invoice ${invoice.id} is paid.`
                : `Invoice ${invoice.id} is waiting for payment.`
            }
          />
        </article>
      ))}
      {filtered.length === 0 && (
        <p className={styles.customer}>No invoices match the filter.</p>
      )}
    </div>
  );
}
