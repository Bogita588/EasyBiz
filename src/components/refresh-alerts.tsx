"use client";

import { useState } from "react";
import styles from "./refresh-alerts.module.css";

export function RefreshAlertsButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/inventory/alerts/refresh", {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStatus(`Alerts refreshed (${data.created} added).`);
    } catch {
      setStatus("Could not refresh alerts. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <button className={styles.button} onClick={refresh} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh low-stock"}
      </button>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}
