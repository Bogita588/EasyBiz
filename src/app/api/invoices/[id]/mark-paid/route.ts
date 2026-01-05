import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = await getTenantId();
    const { id } = await params;
    const invoiceId = id;
    const body = await request.json();
    const method = body?.method ?? "CASH";
    const amountRaw = body?.amount;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { total: true, status: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const amount =
      amountRaw !== undefined
        ? new Prisma.Decimal(amountRaw)
        : invoice.total ?? new Prisma.Decimal(0);

    await prisma.$transaction([
      prisma.payment.create({
        data: {
          tenantId,
          invoiceId,
          method,
          status: "CONFIRMED",
          amount,
          confirmedAt: new Date(),
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID" },
      }),
      prisma.activityEvent.create({
        data: {
          tenantId,
          type: "PAYMENT",
          message: "Payment received. All settled.",
          refType: "invoice",
          refId: invoiceId,
        },
      }),
    ]);

    return NextResponse.json({ message: "Invoice marked as paid." });
  } catch (error) {
    console.error("[PATCH /api/invoices/:id/mark-paid]", error);
    return NextResponse.json(
      { error: "Could not mark invoice as paid." },
      { status: 500 },
    );
  }
}

export { PATCH as POST };
