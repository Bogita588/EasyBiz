import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { checkIdempotency, storeIdempotency } from "@/lib/idempotency";

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")
        : null;
    const idempoHit = await checkIdempotency({
      tenantId,
      scope: "po:create",
      key: idempotencyKey,
    });
    if (idempoHit) {
      return NextResponse.json(idempoHit.response, { status: idempoHit.status });
    }

    const body = await request.json();
    const itemId = body?.itemId as string | undefined;
    const quantity = Number(body?.quantity) || 0;
    const supplierId = body?.supplierId as string | undefined;
    const needBy = body?.needBy ? new Date(body.needBy) : null;
    const dueDate = body?.dueDate ? new Date(body.dueDate) : null;
    const unitCost = body?.unitCost ? new Prisma.Decimal(body.unitCost) : new Prisma.Decimal(0);
    const total = unitCost.mul(quantity);
    const totalNumber = Number(total);

    if (!itemId) {
      return NextResponse.json({ error: "Missing item id." }, { status: 400 });
    }
    if (quantity <= 0) {
      return NextResponse.json(
        { error: "Quantity must be greater than 0." },
        { status: 400 },
      );
    }
    if (!supplierId) {
      return NextResponse.json(
        { error: "Supplier is required for an order." },
        { status: 400 },
      );
    }

    const item = await prisma.item.findFirst({
      where: { id: itemId, tenantId },
      select: {
        id: true,
        name: true,
        preferredSupplier: { select: { name: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId, tenantId },
      select: { name: true },
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        status: "ORDERED",
        total,
        paidAmount: new Prisma.Decimal(0),
        supplierId,
        needBy: needBy ?? undefined,
        dueDate: dueDate ?? undefined,
        lines: {
          create: [
            {
              itemId,
              quantity,
              unitCost,
            },
          ],
        },
      },
      select: { id: true },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId,
        type: "PO",
        message: `Order placed for ${quantity} × ${item.name}${
          supplier?.name ? ` from ${supplier.name}` : ""
        }${needBy ? ` • need by ${needBy.toISOString().slice(0, 10)}` : ""}${
          dueDate ? ` • due ${dueDate.toISOString().slice(0, 10)}` : ""
        } • Total KES ${totalNumber.toLocaleString()}.`,
        refType: "purchaseOrder",
        refId: po.id,
      },
    });

    const message = `Order for ${quantity} × ${item.name} has been placed${
      needBy ? `, expected ${needBy.toISOString().slice(0, 10)}` : ""
    }${dueDate ? `, due ${dueDate.toISOString().slice(0, 10)}` : ""}. Total KES ${totalNumber.toLocaleString()}.`;

    const responseBody = { purchaseOrderId: po.id, message };
    await storeIdempotency({
      tenantId,
      scope: "po:create",
      key: idempotencyKey,
      status: 200,
      response: responseBody,
    });
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error("[POST /api/purchase-orders]", error);
    return NextResponse.json(
      { error: "Could not create purchase order." },
      { status: 500 },
    );
  }
}
