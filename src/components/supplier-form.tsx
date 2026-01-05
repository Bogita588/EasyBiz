"use client";

import { useState } from "react";
import styles from "./supplier-form.module.css";

export function SupplierForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, whatsapp }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Create failed");
      }
      setStatus("Supplier added.");
      setName("");
      setPhone("");
      setEmail("");
      setWhatsapp("");
    } catch {
      setStatus("Could not add supplier.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Add supplier</p>
      <div className={styles.grid}>
        <input
          className={styles.input}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="WhatsApp"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
        />
        <button
          className={styles.primary}
          type="button"
          onClick={handleCreate}
          disabled={busy}
        >
          Add
        </button>
      </div>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}
