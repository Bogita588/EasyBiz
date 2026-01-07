import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { parseTenant, parseRole } from "@/lib/auth";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const WINDOW_SECONDS = 15;
const MAX_REQUESTS = 50;

export async function redisRateLimit(request: NextRequest) {
  if (!redis) return null;
  const tenant = parseTenant(request.headers) || "anon";
  const role = parseRole(request.headers);
  const ip = request.headers.get("x-forwarded-for") || "ip";
  const key = `rl:${tenant}:${role}:${ip}`;
  const res = await redis.pipeline().incr(key).expire(key, WINDOW_SECONDS).exec();
  const count = Number(res?.[0]?.result || 0);
  if (count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again shortly." },
      { status: 429 },
    );
  }
  return null;
}
