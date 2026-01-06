import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/login", url.origin));
  res.headers.append("Set-Cookie", "ez_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  return res;
}
