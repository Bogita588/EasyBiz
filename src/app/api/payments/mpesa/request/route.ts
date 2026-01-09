import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const invoiceId = body?.invoiceId as string | undefined;
    const amount = body?.amount as string | number | undefined;
    const phone = body?.phone as string | undefined;

    if (!invoiceId || !amount) {
      return NextResponse.json(
        { error: "Missing invoice or amount." },
        { status: 400 },
      );
    }

    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")
        : `${invoiceId}:${amount}:${phone || "mpesa"}`;
    const cached = await checkIdempotency({
      tenantId,
      scope: "mpesa_request",
      key: idempotencyKey,
    });
    if (cached) {
      return NextResponse.json(cached.response, { status: cached.status });
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
        source: "INVOICE",
        method: "MPESA_TILL",
        status: "PENDING",
        amount: amount,
        requestedAt: new Date(),
        mpesaReceipt: phone ?? null,
      },
      select: { id: true },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PAYMENT",
        message: "Payment request sent via M-Pesa.",
        refType: "payment",
        refId: payment.id,
      },
    });

    const responsePayload = {
      paymentId: payment.id,
      message: "Payment request sent.",
    };

    await storeIdempotency({
      tenantId,
      scope: "mpesa_request",
      key: idempotencyKey,
      status: 200,
      response: responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[POST /api/payments/mpesa/request]", error);
    return NextResponse.json(
      { error: "Could not request payment." },
      { status: 500 },
    );
  }
}
