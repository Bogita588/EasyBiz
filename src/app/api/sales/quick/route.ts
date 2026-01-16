import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const item = typeof body?.item === "string" ? body.item.trim() : "";
    const qty = body?.quantity ? Number(body.quantity) : 1;
    const amount = body?.amount ? Number(body.amount) : 0;
    const method =
      body?.method === "CASH" ||
      body?.method === "MPESA_TILL" ||
      body?.method === "MPESA_PAYBILL" ||
      body?.method === "MPESA_POCHI"
        ? body.method
        : "CASH";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0." }, { status: 400 });
    }
    if (!item) {
      return NextResponse.json({ error: "Item is required." }, { status: 400 });
    }

    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")
        : null;
    if (idempotencyKey) {
      const hit = await checkIdempotency({ tenantId, scope: "sales:quick", key: idempotencyKey });
      if (hit) {
        return NextResponse.json(hit.response, { status: hit.status });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: null,
        source: "COUNTER",
        method,
        status: "CONFIRMED",
        amount: amount,
        confirmedAt: new Date(),
        mpesaReceipt: note || null,
      },
      select: { id: true, amount: true, method: true, confirmedAt: true },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PAYMENT",
        message: `Counter sale: ${item}${qty ? ` x${qty}` : ""} • KES ${amount.toLocaleString()} via ${method.replace("MPESA_", "M-Pesa ")}.`,
        refType: "payment",
        refId: payment.id,
      },
    });

    const responsePayload = { paymentId: payment.id, message: "Sale recorded." };
    await storeIdempotency({
      tenantId,
      scope: "sales:quick",
      key: idempotencyKey,
      status: 200,
      response: responsePayload,
    });

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error) {
    console.error("[POST /api/sales/quick]", error);
    return NextResponse.json({ error: "Could not record sale." }, { status: 500 });
  }
}
