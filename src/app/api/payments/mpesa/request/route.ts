import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

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

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId,
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

    return NextResponse.json({
      paymentId: payment.id,
      message: "Payment request sent.",
    });
  } catch (error) {
    console.error("[POST /api/payments/mpesa/request]", error);
    return NextResponse.json(
      { error: "Could not request payment." },
      { status: 500 },
    );
  }
}
