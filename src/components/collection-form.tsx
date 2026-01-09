"use client";

import { useState, useEffect } from "react";
import styles from "@/app/collections/collections.module.css";
import { getCsrfToken } from "@/lib/csrf";

const methods = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA_TILL", label: "M-Pesa Till" },
  { value: "MPESA_PAYBILL", label: "M-Pesa Paybill" },
  { value: "MPESA_POCHI", label: "M-Pesa Pochi" },
];

export function CollectionForm() {
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!amount || amount <= 0) {
        setMessage("Enter a valid amount.");
        setBusy(false);
        return;
      }
      const csrf = getCsrfToken();
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ amount, method, note }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed");
      }
      setMessage("Collection recorded.");
      setAmount(0);
      setNote("");
    } catch {
      setMessage("Could not record collection.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <p className={styles.label}>Add collection</p>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          type="number"
          min={0}
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder="Amount (KES)"
        />
        <select
          className={styles.input}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {methods.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <input
          className={styles.input}
          placeholder="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          className={styles.primary}
          onClick={submit}
          disabled={busy}
        >
          Record collection
        </button>
      </div>
      {message && <p className={styles.meta}>{message}</p>}
    </div>
  );
}
