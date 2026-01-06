import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseRole, parseTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const role = parseRole(request.headers);
    const tenantId = parseTenant(request.headers);
    if (!tenantId) {
      return NextResponse.json({ error: "Missing tenant." }, { status: 401 });
    }
    if (!["ADMIN", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Not allowed." }, { status: 403 });
    }
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const newRole =
      body?.role === "OWNER" || body?.role === "MANAGER" || body?.role === "ATTENDANT"
        ? body.role
        : "ATTENDANT";

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields." }, { status: 400 });
    }

    if (role !== "ADMIN") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { userSeatsEnabled: true },
      });
      if (!tenant?.userSeatsEnabled) {
        return NextResponse.json(
          { error: "Extra users are not enabled for this tenant. Ask admin to allow it." },
          { status: 403 },
        );
      }
    }

    const existing = await prisma.user.findFirst({ where: { tenantId, email } });
    if (existing) {
      return NextResponse.json({ error: "Email already exists for this tenant." }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        tenantId,
        name,
        email,
        role: newRole,
        password: hash,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("[POST /api/users]", error);
    return NextResponse.json({ error: "Could not create user." }, { status: 500 });
  }
}
