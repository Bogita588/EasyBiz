import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

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
    const receipt = typeof body?.receipt === "string" ? body.receipt.trim() : "";
    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")
        : `${invoiceId}:${method}:${amountRaw ?? "auto"}:${receipt || "n/a"}`;
    const hit = await checkIdempotency({
      tenantId,
      scope: "invoice:mark-paid",
      key: idempotencyKey,
    });
    if (hit) {
      return NextResponse.json(hit.response, { status: hit.status });
    }

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
          source: "INVOICE",
          method,
          status: "CONFIRMED",
          amount,
          confirmedAt: new Date(),
          mpesaReceipt: receipt || null,
        },
      }),
      prisma.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { status: "PAID" },
      }),
      prisma.activityEvent.create({
        data: {
          tenantId,
          type: "PAYMENT",
          message: `Invoice paid via ${method.replace("MPESA_", "M-Pesa ")}.`,
          refType: "invoice",
          refId: invoiceId,
        },
      }),
    ]);

    const responsePayload = { message: "Invoice marked as paid." };
    await storeIdempotency({
      tenantId,
      scope: "invoice:mark-paid",
      key: idempotencyKey,
      status: 200,
      response: responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[PATCH /api/invoices/:id/mark-paid]", error);
    return NextResponse.json(
      { error: "Could not mark invoice as paid." },
      { status: 500 },
    );
  }
}

export { PATCH as POST };
