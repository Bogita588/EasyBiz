"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/app/customers/customers.module.css";

type Props = {
  initial?: { id: string; name: string; phone: string | null; priceTier: "RETAIL" | "WHOLESALE" };
  mode?: "create" | "edit";
  customerId?: string;
};

export function CustomerForm({ initial, mode = "create", customerId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [priceTier, setPriceTier] = useState<"RETAIL" | "WHOLESALE">(initial?.priceTier ?? "RETAIL");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const payload = { name, phone: phone || null, priceTier };
      const url =
        mode === "edit" && customerId ? `/api/customers/${customerId}` : "/api/customers";
      const method = mode === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Save failed");
      }
      setMessage(mode === "edit" ? "Customer updated." : "Customer added.");
      if (mode === "create") {
        setName("");
        setPhone("");
        setPriceTier("RETAIL");
      }
      router.refresh();
    } catch {
      setMessage("Could not save customer.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!customerId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage("Customer deleted.");
      router.push("/customers");
      router.refresh();
    } catch {
      setMessage("Could not delete customer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <p className={styles.label}>{mode === "edit" ? "Edit customer" : "Add customer"}</p>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <select
          className={styles.input}
          value={priceTier}
          onChange={(e) => setPriceTier(e.target.value as "RETAIL" | "WHOLESALE")}
        >
          <option value="RETAIL">Retail</option>
          <option value="WHOLESALE">Wholesale</option>
        </select>
        <button
          className={styles.primary}
          type="button"
          onClick={submit}
          disabled={busy || !name.trim()}
        >
          {mode === "edit" ? "Save changes" : "Add"}
        </button>
        {mode === "edit" && (
          <button
            className={styles.danger}
            type="button"
            onClick={remove}
            disabled={busy}
          >
            Delete
          </button>
        )}
      </div>
      {message && <p className={styles.helper}>{message}</p>}
    </div>
  );
}
