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
    const priceTier =
      body?.priceTier === "WHOLESALE" || body?.priceTier === "RETAIL"
        ? body.priceTier
        : undefined;

    const customer = await prisma.customer.update({
      where: { id, tenantId },
      data: { name, phone, priceTier },
      select: { id: true, name: true, phone: true, priceTier: true },
    });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("[PATCH /api/customers/:id]", error);
    return NextResponse.json(
      { error: "Could not update customer." },
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
    await prisma.customer.delete({ where: { id, tenantId } });
    return NextResponse.json({ message: "Customer deleted." });
  } catch (error) {
    console.error("[DELETE /api/customers/:id]", error);
    return NextResponse.json(
      { error: "Could not delete customer." },
      { status: 500 },
    );
  }
}
