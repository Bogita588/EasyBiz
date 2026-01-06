"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function StatusWatcher() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/tenant/status", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.status === "SUSPENDED") {
          router.replace("/access/suspended");
          return;
        }
        if (data.status === "ACTIVE") {
          // Require a fresh login before entering ERP after state changes.
          router.replace("/login?status=approved");
          return;
        }
        // Still pending/unknown; keep polling.
        setTimeout(poll, 6000);
      } catch {
        if (active) setTimeout(poll, 7000);
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
