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
    const amount =
      body?.amount !== undefined && body?.amount !== null
        ? new Prisma.Decimal(body.amount)
        : null;

    const poRecord = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId },
      select: {
        total: true,
        paidAmount: true,
        needBy: true,
        dueDate: true,
        lines: {
          select: {
            quantity: true,
            itemId: true,
            item: { select: { name: true } },
          },
        },
        supplier: { select: { name: true } },
      },
    });

    if (!poRecord) {
      return NextResponse.json({ error: "PO not found." }, { status: 404 });
    }

    const currentPaid = poRecord.paidAmount ? Number(poRecord.paidAmount) : 0;
    const totalNumber = poRecord.total ? Number(poRecord.total) : 0;
    const incoming = amount ? Number(amount) : 0;
    const newPaid = Math.min(totalNumber, currentPaid + incoming);
    const status =
      newPaid >= totalNumber && totalNumber > 0
        ? "RECEIVED"
        : amount
          ? "PARTIAL"
          : "RECEIVED";

    const now = new Date();
    const setPaidAt = status === "RECEIVED" && newPaid >= totalNumber && totalNumber > 0;

    const poUpdate = prisma.purchaseOrder.update({
      where: { id, tenantId },
      data: {
        status,
        paidAt: setPaidAt ? now : null,
        paidAmount: new Prisma.Decimal(newPaid),
      },
      select: { id: true, total: true, paidAmount: true },
    });

    const stockUpdates = poRecord.lines
      .filter((line) => line.itemId)
      .map((line) =>
        prisma.item.update({
          where: { id: line.itemId! },
          data: { stockQuantity: { increment: line.quantity } },
        }),
      );

    const firstLine = poRecord.lines[0];
    const lineSummary = firstLine
      ? `${firstLine.quantity} × ${firstLine.item?.name || "item"}`
      : "order";
    let expectedText = "";
    if (poRecord.needBy) {
      const expected = poRecord.needBy.toISOString().slice(0, 10);
      if (now <= poRecord.needBy) {
        expectedText = ` Delivered early (before ${expected}).`;
      } else {
        expectedText = ` Delivered late (after ${expected}).`;
      }
    } else if (poRecord.dueDate) {
      const due = poRecord.dueDate.toISOString().slice(0, 10);
      if (now <= poRecord.dueDate) {
        expectedText = ` Delivered early (before ${due}).`;
      } else {
        expectedText = ` Delivered late (after ${due}).`;
      }
    }
    const supplierName = poRecord.supplier?.name
      ? ` from ${poRecord.supplier.name}`
      : "";

    const activity = prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PO",
        message: `Order ${lineSummary}${supplierName} received on ${now
          .toISOString()
          .slice(0, 10)}. Paid KES ${newPaid.toLocaleString()} of ${totalNumber.toLocaleString()}.${expectedText}`,
        refType: "purchaseOrder",
        refId: id,
      },
    });

    await prisma.$transaction([poUpdate, ...stockUpdates, activity]);

    return NextResponse.json({ message: "Purchase order marked paid." });
  } catch (error) {
    console.error("[PATCH /api/purchase-orders/:id/mark-paid]", error);
    return NextResponse.json(
      { error: "Could not mark purchase order paid." },
      { status: 500 },
    );
  }
}
