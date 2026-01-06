import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHash } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();
    const password = formData.get("password") as string | null;
    if (!email || !password) {
      return NextResponse.redirect(new URL("/login?error=missing", baseUrl(request)));
    }

    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, role: true, password: true, tenantId: true, tenant: { select: { status: true } } },
    });
    if (!user || !user.password) {
      return NextResponse.redirect(new URL("/login?error=invalid", baseUrl(request)));
    }

    const hash = hashPassword(password);
    if (hash !== user.password) {
      return NextResponse.redirect(new URL("/login?error=invalid", baseUrl(request)));
    }

    const role = (user.role || "ATTENDANT").toString();
    const tenantStatus = user.tenant?.status ?? "UNKNOWN";
    const sessionPayload = {
      userId: user.id,
      tenantId: user.tenantId,
      role,
      tenantStatus,
    };

    const cookie = Buffer.from(JSON.stringify(sessionPayload)).toString("base64");
    const target =
      role === "ADMIN"
        ? "/admin"
        : tenantStatus === "ACTIVE"
          ? "/home"
          : "/access/pending";

    const res = NextResponse.redirect(new URL(target, baseUrl(request)));
    res.headers.append(
      "Set-Cookie",
      `ez_session=${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );
    return res;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.redirect(new URL("/login?error=unknown", baseUrl(request)));
  }
}

function hashPassword(pw: string) {
  return createHash("sha256").update(pw).digest("hex");
}

function baseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
