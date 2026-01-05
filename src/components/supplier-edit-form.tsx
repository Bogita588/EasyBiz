"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./supplier-form.module.css";

type Props = {
  supplierId: string;
  initial: { name: string; phone: string | null; email?: string | null; whatsapp?: string | null };
};

export function SupplierEditForm({ supplierId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [email, setEmail] = useState(initial.email ?? "");
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2200);
    return () => clearTimeout(t);
  }, [message]);

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phone || null,
          email: email || null,
          whatsapp: whatsapp || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Save failed");
      }
      setMessage("Supplier updated.");
      router.refresh();
    } catch {
      setMessage("Could not update supplier.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/suppliers/${supplierId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessage("Supplier deleted.");
      router.push("/suppliers");
      router.refresh();
    } catch {
      setMessage("Could not delete supplier.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Edit supplier</p>
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
        <button className={styles.primary} type="button" onClick={save} disabled={busy || !name}>
          Save
        </button>
        <button className={styles.danger} type="button" onClick={remove} disabled={busy}>
          Delete
        </button>
      </div>
      {message && <p className={styles.status}>{message}</p>}
    </div>
  );
}
