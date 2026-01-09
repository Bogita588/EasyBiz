import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password." }, { status: 400 });
    }

    const reset = await prisma.passwordReset.findUnique({
      where: { token },
      select: { id: true, userId: true, tenantId: true, expiresAt: true, usedAt: true },
    });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invalid or expired token." }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { password: hash } }),
      prisma.passwordReset.update({ where: { token }, data: { usedAt: new Date() } }),
      prisma.activityEvent.create({
        data: {
          tenantId: reset.tenantId,
          type: "PAYMENT",
          message: "Password reset completed.",
          refType: "user",
          refId: reset.userId,
        },
      }),
    ]);

    await logAudit({
      tenantId: reset.tenantId,
      userId: reset.userId,
      action: "password_reset_completed",
    });

    return NextResponse.json({ message: "Password updated. You can now sign in." });
  } catch (error) {
    console.error("[POST /api/auth/reset/confirm]", error);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
