import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ message: "If the email exists, a reset link will be sent." }, { status: 200 });
    }
    const user = await prisma.user.findFirst({
      where: { email },
      select: { id: true, tenantId: true },
    });
    if (!user) {
      return NextResponse.json({ message: "If the email exists, a reset link will be sent." }, { status: 200 });
    }
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tenantId: user.tenantId,
        token,
        expiresAt,
      },
    });
    await logAudit({
      tenantId: user.tenantId,
      userId: user.id,
      action: "password_reset_requested",
      meta: { email },
    });
    // In production, send email/WhatsApp with the link. For now, return generic message.
    return NextResponse.json({ message: "If the email exists, a reset link will be sent." });
  } catch (error) {
    console.error("[POST /api/auth/reset/request]", error);
    return NextResponse.json({ error: "Could not process reset." }, { status: 500 });
  }
}
