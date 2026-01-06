"use client";

import { useEffect, useState } from "react";
import styles from "@/app/admin/admin.module.css";

export function AdminTenantForm() {
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ magicLink: string } | null>(null);

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 2600);
    return () => clearTimeout(t);
  }, [status]);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    setInvite(null);
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          businessType,
          ownerName,
          ownerEmail,
          ownerPhone,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Create failed");
      }
      const data = await res.json();
      setStatus(`Tenant created: ${data.tenant.name}`);
      setInvite({ magicLink: data.invite.magicLink });
      setName("");
      setBusinessType("");
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPhone("");
    } catch {
      setStatus("Could not create tenant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.card}>
      <p className={styles.label}>Create tenant</p>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          placeholder="Tenant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Business type"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Owner name"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Owner email"
          value={ownerEmail}
          onChange={(e) => setOwnerEmail(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Owner phone"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
        />
        <button
          type="button"
          className={styles.primary}
          onClick={submit}
          disabled={busy || !name.trim()}
        >
          Provision tenant
        </button>
      </div>
      {status && <p className={styles.meta}>{status}</p>}
      {invite && (
        <p className={styles.meta}>
          Magic link (share with owner): <code>{invite.magicLink}</code>
        </p>
      )}
    </div>
  );
}
