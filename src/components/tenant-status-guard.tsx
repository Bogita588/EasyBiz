"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const SKIP_PATHS = ["/login", "/signup", "/register", "/admin", "/access/pending", "/access/suspended"];

export function TenantStatusGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (SKIP_PATHS.some((p) => pathname?.startsWith(p))) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/tenant/status", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        if (data.status === "PENDING") {
          router.replace("/access/pending");
        } else if (data.status === "SUSPENDED") {
          router.replace("/access/suspended");
        } else if (data.status !== "ACTIVE") {
          // Unknown: keep polling
          setTimeout(poll, 6000);
        } else {
          setTimeout(poll, 8000);
        }
      } catch {
        if (active) setTimeout(poll, 8000);
      }
    };
    poll();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  return null;
}
