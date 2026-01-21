"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/admin/admin.module.css";
import { getCsrfToken } from "@/lib/csrf";

type Props = {
  tenantId: string;
  initialStatus: "ACTIVE" | "PENDING" | "SUSPENDED" | "UNKNOWN";
  userSeatsEnabled: boolean;
  userSeatsRequested?: boolean;
};

export function AdminStatusButtons({
  tenantId,
  initialStatus,
  userSeatsEnabled,
  userSeatsRequested = false,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [seatsEnabled, setSeatsEnabled] = useState(userSeatsEnabled);

  const update = async (value: "ACTIVE" | "PENDING" | "SUSPENDED") => {
    setBusy(true);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/admin/tenants/${tenantId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
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

  const toggleSeats = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/admin/tenants/${tenantId}/user-seats`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ enabled: !seatsEnabled }),
      });
      if (!res.ok) throw new Error();
      setSeatsEnabled((v) => !v);
      setMessage(!seatsEnabled ? "Extra users enabled." : "Extra users disabled.");
      router.refresh();
    } catch {
      setMessage("Could not update user access.");
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
      <button
        className={styles.secondary}
        onClick={toggleSeats}
        type="button"
        disabled={busy}
        title="Allow owners to add extra users as an add-on"
      >
        {seatsEnabled ? "Disable extra users" : "Enable extra users"}
      </button>
      {userSeatsRequested && !seatsEnabled && <span className={styles.statusPill}>Request pending</span>}
      {message && <span className={styles.meta}>{message}</span>}
    </div>
  );
}
