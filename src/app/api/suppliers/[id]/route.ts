import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : undefined;
    const phone =
      body?.phone === null
        ? null
        : typeof body?.phone === "string"
          ? body.phone.trim()
          : undefined;
    const email =
      body?.email === null
        ? null
        : typeof body?.email === "string"
          ? body.email.trim()
          : undefined;
    const whatsapp =
      body?.whatsapp === null
        ? null
        : typeof body?.whatsapp === "string"
          ? body.whatsapp.trim()
          : undefined;

    try {
      const supplier = await prisma.supplier.update({
        where: { id, tenantId },
        data: { name, phone, email, whatsapp },
        select: { id: true, name: true, phone: true, email: true, whatsapp: true },
      });
      return NextResponse.json({ supplier });
    } catch {
      // Fallback when email/whatsapp columns are absent
      const supplier = await prisma.supplier.update({
        where: { id, tenantId },
        data: { name, phone },
        select: { id: true, name: true, phone: true },
      });
      return NextResponse.json({ supplier });
    }
  } catch (error) {
    console.error("[PATCH /api/suppliers/:id]", error);
    return NextResponse.json(
      { error: "Could not update supplier." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    await prisma.supplier.delete({ where: { id, tenantId } });
    return NextResponse.json({ message: "Supplier deleted." });
  } catch (error) {
    console.error("[DELETE /api/suppliers/:id]", error);
    return NextResponse.json(
      { error: "Could not delete supplier." },
      { status: 500 },
    );
  }
}
