import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const tenantId = await getTenantId();
    const body = await request.json();
    const amount = body?.amount ? new Prisma.Decimal(body.amount) : null;

    const poRecord = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId },
      select: { total: true },
    });

    if (!poRecord) {
      return NextResponse.json({ error: "PO not found." }, { status: 404 });
    }

    const status =
      amount && poRecord.total && amount.lt(poRecord.total)
        ? "PARTIAL"
        : "RECEIVED";

    const po = await prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status,
        paidAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PO",
        message: "Supplier order marked as received/paid.",
        refType: "purchaseOrder",
        refId: po.id,
      },
    });

    return NextResponse.json({ message: "Purchase order marked paid." });
  } catch (error) {
    console.error("[PATCH /api/purchase-orders/:id/mark-paid]", error);
    return NextResponse.json(
      { error: "Could not mark purchase order paid." },
      { status: 500 },
    );
  }
}
