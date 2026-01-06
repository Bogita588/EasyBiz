"use client";

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/admin/admin.module.css";

type Props = {
  tenantId: string;
  initialStatus: "ACTIVE" | "PENDING" | "SUSPENDED" | "UNKNOWN";
};

export function AdminStatusButtons({ tenantId, initialStatus }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const update = async (value: "ACTIVE" | "PENDING" | "SUSPENDED") => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      if (!res.ok) throw new Error();
      setStatus(value);
      setMessage(value === "ACTIVE" ? "Approved ✓" : value === "SUSPENDED" ? "Suspended" : "Pending");
      router.refresh();
    } catch {
      setMessage("Could not update status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.actionsRow}>
      <span className={styles.statusPill}>{status}</span>
      <button className={styles.primary} onClick={() => update("ACTIVE")} type="button" disabled={busy}>
        Approve
      </button>
      <button className={styles.secondary} onClick={() => update("PENDING")} type="button" disabled={busy}>
        Pending
      </button>
      <button className={styles.danger} onClick={() => update("SUSPENDED")} type="button" disabled={busy}>
        Suspend
      </button>
      {message && <span className={styles.meta}>{message}</span>}
    </div>
  );
}
