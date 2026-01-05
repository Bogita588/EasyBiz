import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { toDecimalOrNull } from "@/lib/sanitize";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { issuedAt: "desc" },
      take: 20,
      include: {
        customer: { select: { name: true } },
      },
    });
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("[GET /api/invoices]", error);
    return NextResponse.json(
      { error: "Could not load invoices." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const customerId = body?.customerId ?? null;
    const items = Array.isArray(body?.items) ? body.items : [];
    const notes = typeof body?.notes === "string" ? body.notes : undefined;

    if (!customerId) {
      return NextResponse.json(
        { error: "Select a customer to send an invoice." },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId, tenantId },
      select: { id: true, name: true },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    if (!items.length) {
      return NextResponse.json(
        { error: "Add at least one item." },
        { status: 400 },
      );
    }

    const normalizedLines = normalizeLines(items);
    if (!normalizedLines.length) {
      return NextResponse.json(
        { error: "Items are invalid." },
        { status: 400 },
      );
    }

    const subtotal = normalizedLines.reduce(
      (sum, line) => sum + Number(line.lineTotal),
      0,
    );
    const firstLine = normalizedLines[0];
    const itemSummary =
      normalizedLines.length > 1
        ? `${firstLine.description} (+${normalizedLines.length - 1} more)`
        : firstLine.description;

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        customerId,
        status: "SENT",
        subtotal: new Prisma.Decimal(subtotal),
        taxTotal: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(subtotal),
        notes,
        lines: {
          create: normalizedLines.map((line) => ({
            itemId: line.itemId,
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
          })),
        },
      },
      select: { id: true },
    });

    // Adjust stock and add feed event
    await prisma.$transaction([
      ...normalizedLines
        .filter((line) => line.itemId)
        .map((line) =>
          prisma.item.update({
            where: { id: line.itemId! },
            data: {
              stockQuantity: { decrement: line.quantity },
            },
          }),
        ),
      prisma.activityEvent.create({
        data: {
          tenantId,
          type: "INVOICE",
          message: `Invoice sent to ${customer.name ?? "customer"} for KES ${subtotal.toLocaleString()}. Items: ${itemSummary}.`,
          refType: "invoice",
          refId: invoice.id,
        },
      }),
    ]);

    return NextResponse.json({
      invoiceId: invoice.id,
      message: "Invoice sent. Waiting for payment.",
    });
  } catch (error) {
    console.error("[POST /api/invoices]", error);
    return NextResponse.json(
      { error: "Could not create invoice." },
      { status: 500 },
    );
  }
}

type IncomingLine = {
  itemId?: string | null;
  description?: string | null;
  quantity?: number | null;
  price?: unknown;
};

function normalizeLines(lines: IncomingLine[]) {
  return lines
    .map((line) => {
      if (!line) return null;
      const description =
        typeof line.description === "string" && line.description.trim().length
          ? line.description.trim()
          : null;
      const itemId =
        typeof line.itemId === "string" && line.itemId.trim().length
          ? line.itemId.trim()
          : null;
      const quantity =
        typeof line.quantity === "number" && line.quantity > 0
          ? Math.floor(line.quantity)
          : 1;
      const priceDecimal = toDecimalOrNull(line.price);
      if (!priceDecimal) return null;
      const unitPrice = priceDecimal;
      const lineTotal = new Prisma.Decimal(
        (Number(unitPrice) * quantity).toFixed(2),
      );

      if (!itemId && !description) return null;
      return {
        itemId,
        description: description ?? "Item",
        quantity,
        unitPrice,
        lineTotal,
      };
    })
    .filter(Boolean) as {
    itemId: string | null;
    description: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
  }[];
}
