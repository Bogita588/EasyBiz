import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

    await prisma.$transaction([
      prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "CONFIRMED",
          mpesaReceipt: mpesaReceipt ?? null,
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
          refType: "payment",
          refId: paymentId,
        },
      }),
    ]);

    return NextResponse.json({ message: "Payment recorded." });
  } catch (error) {
    console.error("[POST /api/payments/mpesa/webhook]", error);
    return NextResponse.json(
      { error: "Could not process payment." },
      { status: 500 },
    );
  }
}
