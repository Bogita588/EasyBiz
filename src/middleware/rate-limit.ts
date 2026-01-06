import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseTenant, parseRole } from "@/lib/auth";

const WINDOW_MS = 15_000;
const MAX_REQUESTS = 50;

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(request: NextRequest) {
  const now = Date.now();
  const tenant = parseTenant(request.headers) || "anon";
  const role = parseRole(request.headers);
  const key = `${tenant}:${role}:${request.headers.get("x-forwarded-for") || "ip"}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
  }
  return null;
}
