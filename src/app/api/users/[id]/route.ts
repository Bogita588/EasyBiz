import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseRole, parseTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolved = params && "then" in (params as any) ? await (params as Promise<{ id: string }>) : (params as { id: string });
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }
    const role = parseRole(request.headers);
    const tenantId = parseTenant(request.headers);
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant." }, { status: 401 });
    }
    if (!["ADMIN", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const emailRaw =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
    const newRole =
      body?.role === "OWNER" || body?.role === "MANAGER" || body?.role === "ATTENDANT"
        ? body.role
        : undefined;
    const newPassword = typeof body?.password === "string" ? body.password : undefined;

    if (!name && !emailRaw && !newRole && !newPassword) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, tenantId: true, email: true },
    });
    if (!target || target.tenantId !== tenantId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    if (emailRaw && emailRaw !== target.email) {
      const exists = await prisma.user.findFirst({
        where: { tenantId, email: emailRaw },
        select: { id: true },
      });
      if (exists) {
        return NextResponse.json(
          { error: "Email already exists for this tenant." },
          { status: 400 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (emailRaw !== undefined) data.email = emailRaw;
    if (newRole) data.role = newRole;
    if (newPassword) data.password = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[PATCH /api/users/:id]", error);
    return NextResponse.json({ error: "Could not update user." }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const resolved = params && "then" in (params as any) ? await (params as Promise<{ id: string }>) : (params as { id: string });
    const id = resolved?.id;
    if (!id) {
      return NextResponse.json({ error: "Missing user id." }, { status: 400 });
    }
    const role = parseRole(request.headers);
    const tenantId = parseTenant(request.headers);
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant." }, { status: 401 });
    }
    if (!["ADMIN", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    });
    if (!target || target.tenantId !== tenantId) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/users/:id]", error);
    return NextResponse.json({ error: "Could not delete user." }, { status: 500 });
  }
}
