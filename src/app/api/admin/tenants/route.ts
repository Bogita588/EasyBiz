import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const businessType = typeof body?.businessType === "string" ? body.businessType.trim() : null;
    const ownerName = typeof body?.ownerName === "string" ? body.ownerName.trim() : null;
    const ownerEmail = typeof body?.ownerEmail === "string" ? body.ownerEmail.trim() : null;
    const ownerPhone = typeof body?.ownerPhone === "string" ? body.ownerPhone.trim() : null;

    if (!name) {
      return NextResponse.json({ error: "Tenant name is required." }, { status: 400 });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        businessType,
        acceptsCash: true,
      },
      select: { id: true, name: true },
    });

    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        role: "OWNER",
      },
      select: { id: true, email: true, phone: true },
    });

    const inviteToken = user.id;
    return NextResponse.json({
      tenant,
      owner: user,
      invite: {
        token: inviteToken,
        magicLink: `https://example.com/invite/${inviteToken}`,
      },
    });
  } catch (error) {
    console.error("[POST /api/admin/tenants]", error);
    return NextResponse.json(
      { error: "Could not create tenant." },
      { status: 500 },
    );
  }
}
