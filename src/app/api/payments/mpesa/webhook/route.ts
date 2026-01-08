import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const paymentId = body?.paymentId as string | undefined;
    const invoiceId = body?.invoiceId as string | undefined;
    const mpesaReceipt = body?.receipt as string | undefined;
    const amountRaw = body?.amount as string | number | undefined;
    const tenantId = body?.tenantId as string | undefined;

    if (!tenantId || !paymentId || !invoiceId || !amountRaw) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    const idempotencyKey =
      request.headers.get("idempotency-key") || `mpesa-webhook-${paymentId}-${mpesaReceipt || amountRaw}`;
    const hit = await checkIdempotency({
      tenantId,
      scope: "mpesa:webhook",
      key: idempotencyKey,
    });
    if (hit) {
      return NextResponse.json(hit.response, { status: hit.status });
    }

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId, tenantId },
        data: {
          status: "CONFIRMED",
          mpesaReceipt: mpesaReceipt ?? null,
          confirmedAt: new Date(),
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
          message: "Payment received. All settled.",
          refType: "payment",
          refId: paymentId,
        },
      }),
    ]);

    const responsePayload = { message: "Payment recorded." };
    await storeIdempotency({
      tenantId,
      scope: "mpesa:webhook",
      key: idempotencyKey,
      status: 200,
      response: responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[POST /api/payments/mpesa/webhook]", error);
    return NextResponse.json(
      { error: "Could not process payment." },
      { status: 500 },
    );
  }
}
