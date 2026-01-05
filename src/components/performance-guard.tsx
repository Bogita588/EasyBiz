"use client";

import { useEffect } from "react";

/**
 * Guards against browser performance.measure crashes seen in dev consoles by
 * swallowing invalid measure calls while keeping metrics intact.
 */
export function PerformanceGuard() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof performance?.measure !== "function") {
      return;
    }
    const original = performance.measure.bind(performance);
    const perfWithOverride = performance as Performance & {
      measure: typeof original;
    };

    perfWithOverride.measure = (...args: Parameters<typeof original>) => {
      try {
        return original(...args);
      } catch {
        console.warn("[perf-guard] skipped measure", args?.[0]);
        return undefined as unknown as PerformanceMeasure;
      }
    };
    return () => {
      perfWithOverride.measure = original;
    };
  }, []);

  return null;
}
