import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const email = (formData.get("email") as string | null)?.trim().toLowerCase();
    const password = formData.get("password") as string | null;
    if (!email || !password) {
      return NextResponse.redirect(new URL("/login?error=missing", baseUrl(request)));
    }

    const candidates = await prisma.user.findMany({
      where: { email },
      select: {
        id: true,
        role: true,
        password: true,
        tenantId: true,
        tenant: { select: { status: true } },
      },
    });
    if (candidates.length === 0) {
      return NextResponse.redirect(new URL("/login?error=invalid", baseUrl(request)));
    }

    let user = null as (typeof candidates[number]) | null;
    for (const c of candidates) {
      if (!c.password) continue;
      if (c.password.startsWith("$2a$") || c.password.startsWith("$2b$")) {
        if (await bcrypt.compare(password, c.password)) {
          user = c;
          break;
        }
      } else if (c.password === password) {
        const upgraded = await bcrypt.hash(password, 10);
        await prisma.user.update({
          where: { id: c.id },
          data: { password: upgraded },
        });
        user = { ...c, password: upgraded };
        break;
      }
    }

    if (!user) {
      return NextResponse.redirect(new URL("/login?error=invalid", baseUrl(request)));
    }

    const role = (user.role || "ATTENDANT").toString();
    const tenantStatus = user.tenant?.status ?? "UNKNOWN";
    const needsOnboarding =
      role !== "ADMIN"
        ? (await prisma.item.count({ where: { tenantId: user.tenantId } })) === 0
        : false;

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
      `ez_session=${cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`,
    );
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: "login_success",
      meta: { role, tenantStatus, needsOnboarding },
    });
    return res;
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.redirect(new URL("/login?error=unknown", baseUrl(request)));
  }
}

function baseUrl(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
