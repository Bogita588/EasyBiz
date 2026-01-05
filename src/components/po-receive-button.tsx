"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "@/app/suppliers/[id]/supplier.module.css";

type Props = {
  poId: string;
};

export function POReceiveButton({ poId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");

  const markReceived = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const amountNumber = amount ? Number(amount) : undefined;
        const res = await fetch(`/api/purchase-orders/${poId}/mark-paid`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amountNumber }),
        });
        if (!res.ok) throw new Error();
        setMessage(amount ? "Marked paid/received." : "Marked as received (unpaid).");
        router.refresh();
      } catch {
        setMessage("Could not update order.");
      }
    });
  };

  return (
    <div className={styles.poActionWrap}>
      <label className={styles.label}>
        Payment amount (optional)
        <input
          className={styles.input}
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="KES"
        />
      </label>
      <button
        type="button"
        className={styles.primary}
        onClick={markReceived}
        disabled={pending}
      >
        Mark received / paid
      </button>
      {message && <p className={styles.helperSmall}>{message}</p>}
    </div>
  );
}
