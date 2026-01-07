import { NextResponse } from "next/server";
import { logAudit } from "@/lib/audit";
import { parseTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tenantId = parseTenant(request.headers);
  const res = NextResponse.redirect(new URL("/login", url.origin));
  res.headers.append(
    "Set-Cookie",
    "ez_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax",
  );
  res.headers.set("Cache-Control", "no-store, must-revalidate");
  await logAudit({ tenantId, action: "logout" });
  return res;
}
