import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const items = await prisma.payment.findMany({
      where: { tenantId, invoiceId: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        method: true,
        amount: true,
        status: true,
        confirmedAt: true,
        createdAt: true,
        mpesaReceipt: true,
      },
      take: 50,
    });
    return NextResponse.json({ collections: items });
  } catch (error) {
    console.error("[GET /api/collections]", error);
    return NextResponse.json({ error: "Could not load collections." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const amount = Number(body?.amount);
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

    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")
        : null;
    if (idempotencyKey) {
      const hit = await checkIdempotency({
        tenantId,
        scope: "collection:create",
        key: idempotencyKey,
      });
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
      select: { id: true, method: true, amount: true, confirmedAt: true },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PAYMENT",
        message: `Collected KES ${amount.toLocaleString()} via ${method.replace("MPESA_", "M-Pesa ")}.`,
        refType: "payment",
        refId: payment.id,
      },
    });

    const responsePayload = { payment };
    await storeIdempotency({
      tenantId,
      scope: "collection:create",
      key: idempotencyKey,
      status: 200,
      response: responsePayload,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[POST /api/collections]", error);
    return NextResponse.json({ error: "Could not record collection." }, { status: 500 });
  }
}
