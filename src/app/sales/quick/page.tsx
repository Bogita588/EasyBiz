"use client";

import { useEffect, useState } from "react";
import styles from "./quick.module.css";
import { getCsrfToken } from "@/lib/csrf";

export const dynamic = "force-dynamic";

export default function QuickSalePage() {
  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Sales</p>
          <h1 className={styles.title}>Record walk-in sale</h1>
          <p className={styles.subtitle}>For customers who pay on the spot (cash or M-Pesa).</p>
        </div>
      </header>
      <div className={styles.card}>
        <QuickSaleForm />
      </div>
    </div>
  );
}

function QuickSaleForm() {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number>(1);
  const [method, setMethod] = useState("CASH");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!item.trim()) {
        setMessage("Enter item/service.");
        setBusy(false);
        return;
      }
      if (!amount || Number(amount) <= 0) {
        setMessage("Enter amount.");
        setBusy(false);
        return;
      }
      const csrf = getCsrfToken();
      const res = await fetch("/api/sales/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ item: item.trim(), amount: Number(amount), quantity, method, note }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed");
      }
      setMessage("Sale recorded.");
      setItem("");
      setAmount("");
      setQuantity(1);
      setNote("");
    } catch {
      setMessage("Could not record sale.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.formGrid}>
      <input
        className={styles.input}
        placeholder="Item or service"
        value={item}
        onChange={(e) => setItem(e.target.value)}
      />
      <input
        className={styles.input}
        type="number"
        min={1}
        placeholder="Qty"
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value) || 1)}
      />
      <input
        className={styles.input}
        type="number"
        min={0}
        placeholder="Amount (KES)"
        value={amount}
        onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
      />
      <select
        className={styles.input}
        value={method}
        onChange={(e) => setMethod(e.target.value)}
      >
        <option value="CASH">Cash</option>
        <option value="MPESA_TILL">M-Pesa Till</option>
        <option value="MPESA_PAYBILL">M-Pesa Paybill</option>
        <option value="MPESA_POCHI">M-Pesa Pochi</option>
      </select>
      <input
        className={styles.input}
        placeholder="Note / receipt (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <button type="button" className={styles.primary} onClick={submit} disabled={busy}>
        Record sale
      </button>
      {message && <p className={styles.meta}>{message}</p>}
    </div>
  );
}
