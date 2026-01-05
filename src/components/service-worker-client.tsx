"use client";

import { useEffect } from "react";

export function ServiceWorkerClient() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        // Fail quietly; offline support will retry on next load.
        console.error("Service worker registration failed", error);
      }
    };

    register();
  }, []);

  return null;
}
