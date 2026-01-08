"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./invoice-quick-actions.module.css";
import { useEffect } from "react";
import { getCsrfToken } from "@/lib/csrf";

type InvoiceQuickActionsProps = {
  invoiceId: string;
  amount: number;
  status: "PAID" | "WAITING" | "SENT" | "DRAFT" | "PARTIAL" | "CANCELLED";
  onStatusChange?: (status: InvoiceQuickActionsProps["status"]) => void;
};

export function InvoiceQuickActions({
  invoiceId,
  amount,
  status,
  onStatusChange,
}: InvoiceQuickActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isPaid = status === "PAID";

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  const updateStatus = (next: InvoiceQuickActionsProps["status"]) => {
    onStatusChange?.(next);
    router.refresh();
  };

  const requestMpesa = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch("/api/payments/mpesa/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
        body: JSON.stringify({ invoiceId, amount }),
      });
      if (!res.ok) throw new Error();
      setMessage("M-Pesa request sent.");
    } catch {
      setMessage("Could not request M-Pesa. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) },
        body: JSON.stringify({ method: "CASH", amount }),
      });
      if (!res.ok) throw new Error();
      updateStatus("PAID");
      setMessage("Payment received. All settled.");
    } catch {
      setMessage("Could not mark paid. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (isPaid) {
    return <p className={styles.message}>Paid</p>;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={requestMpesa}
          disabled={busy}
          className={styles.linkButton}
        >
          Request M-Pesa
        </button>
        <button
          type="button"
          onClick={markPaid}
          disabled={busy}
          className={styles.linkButton}
        >
          Mark paid
        </button>
      </div>
      {message && (
        <div className={styles.toastContainer}>
          <div className={styles.toast}>{message}</div>
        </div>
      )}
    </div>
  );
}
