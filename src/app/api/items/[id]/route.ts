import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { toDecimalOrNull } from "@/lib/sanitize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId();
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.category !== undefined) data.category = body.category;
    if (body.lowStockThreshold !== undefined) {
      data.lowStockThreshold = Number(body.lowStockThreshold) || 0;
    }
    if (body.kind === "SERVICE" || body.kind === "PRODUCT") {
      data.kind = body.kind;
    }
    if (body.preferredSupplierId !== undefined) {
      data.preferredSupplierId = body.preferredSupplierId || null;
    }
    if (body.price !== undefined) {
      const priceDecimal = toDecimalOrNull(body.price);
      if (!priceDecimal) {
        return NextResponse.json(
          { error: "Invalid price." },
          { status: 400 },
        );
      }
      data.price = priceDecimal;
    }

    const item = await prisma.item.update({
      where: { id, tenantId },
      data,
      include: { preferredSupplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[PATCH /api/items/:id]", error);
    return NextResponse.json(
      { error: "Could not update item." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId();

    await prisma.item.delete({
      where: { id, tenantId },
    });

    return NextResponse.json({ message: "Item deleted." });
  } catch (error) {
    console.error("[DELETE /api/items/:id]", error);
    return NextResponse.json(
      { error: "Could not delete item." },
      { status: 500 },
    );
  }
}
