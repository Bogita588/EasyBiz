"use client";

import { useEffect, useState } from "react";
import styles from "@/app/users/users.module.css";

type Props = {
  initialEnabled: boolean;
  initialRequested: boolean;
};

export function UserSeatRequester({ initialEnabled, initialRequested }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [requested, setRequested] = useState(initialRequested);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/tenant/seats", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setEnabled(Boolean(data.enabled));
        setRequested(Boolean(data.requested));
        if (data.enabled) {
          // Force refresh to show unlocked form.
          window.location.reload();
          return;
        }
      } catch {
        // ignore
      }
      if (active) setTimeout(poll, 6000);
    };
    poll();
    return () => {
      active = false;
    };
  }, []);

  const request = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/tenant/seats", { method: "POST" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequested(Boolean(data.requested));
      setMessage("Request sent to admin.");
    } catch {
      setMessage("Could not send request. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (enabled) return null;

  return (
    <div className={styles.requester}>
      <button className={styles.primary} type="button" onClick={request} disabled={busy || requested}>
        {requested ? "Request sent" : "Request extra users"}
      </button>
      {message && <p className={styles.meta}>{message}</p>}
    </div>
  );
}
