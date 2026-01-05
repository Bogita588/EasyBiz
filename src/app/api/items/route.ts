import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { toDecimalOrNull } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const items = await prisma.item.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: { preferredSupplier: { select: { id: true, name: true } } },
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/items]", error);
    return NextResponse.json(
      { error: "Could not load items." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenantId = await getTenantId();
    const body = await request.json();
    const name = body?.name as string | undefined;
    const priceRaw = body?.price;
    const lowStockThreshold = body?.lowStockThreshold
      ? Number(body.lowStockThreshold)
      : 5;
    const kind = body?.kind === "SERVICE" ? "SERVICE" : "PRODUCT";
    const category = body?.category ?? null;
    const supplierId = body?.preferredSupplierId ?? null;

    if (!name) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const priceDecimal = toDecimalOrNull(priceRaw);
    if (!priceDecimal) {
      return NextResponse.json(
        { error: "Price is required." },
        { status: 400 },
      );
    }

    const item = await prisma.item.create({
      data: {
        tenantId,
        name,
        price: priceDecimal,
        lowStockThreshold,
        kind,
        category,
        preferredSupplierId: supplierId,
      },
      include: { preferredSupplier: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[POST /api/items]", error);
    return NextResponse.json(
      { error: "Could not create item." },
      { status: 500 },
    );
  }
}
