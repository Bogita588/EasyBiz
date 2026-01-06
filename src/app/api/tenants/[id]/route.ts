import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimalOrNull } from "@/lib/sanitize";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tenantId = id;

  if (!tenantId) {
    return NextResponse.json({ error: "Missing tenant id." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (body.businessType !== undefined) {
      updateData.businessType = body.businessType;
    }

    if (body.layout !== undefined) {
      const allowed = ["GENERIC", "DUKA", "SALON", "HARDWARE", "EATERY", "SERVICE"];
      const raw = typeof body.layout === "string" ? body.layout.toUpperCase() : "";
      updateData.layout = allowed.includes(raw) ? raw : "GENERIC";
    }

    if (body.businessName !== undefined) {
      updateData.name = body.businessName || "My business";
    }

    if (body.payment) {
      updateData.mpesaTill = body.payment.mpesaTill ?? null;
      updateData.mpesaPaybill = body.payment.mpesaPaybill ?? null;
      updateData.mpesaPochi = body.payment.mpesaPochi ?? null;
      if (body.payment.acceptsCash !== undefined) {
        updateData.acceptsCash = body.payment.acceptsCash;
      }
    }

    const firstItems = normalizeFirstItems(body.firstItems ?? body.firstItem);

    const presetItems =
      firstItems.length === 0 && updateData.layout ? presetForLayout(updateData.layout as string) : [];

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...updateData,
        ...(firstItems.length || presetItems.length
          ? {
              items: {
                create: firstItems.length ? firstItems : presetItems,
              },
            }
          : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({
      tenantId: tenant.id,
      message: "Tenant updated.",
    });
  } catch (error) {
    console.error("[PATCH /api/tenants/:id]", error);
    return NextResponse.json(
      { error: "Could not update tenant." },
      { status: 500 },
    );
  }
}

function presetForLayout(layout: string) {
  const map: Record<string, { name: string; price: string; lowStockThreshold?: number }[]> = {
    DUKA: [
      { name: "Sugar (1kg)", price: "180", lowStockThreshold: 10 },
      { name: "Cooking oil (500ml)", price: "220", lowStockThreshold: 12 },
    ],
    SALON: [
      { name: "Haircut", price: "300", lowStockThreshold: 2 },
      { name: "Braiding", price: "800", lowStockThreshold: 1 },
    ],
    HARDWARE: [
      { name: "Cement bag (50kg)", price: "750", lowStockThreshold: 20 },
      { name: "Nails (1kg)", price: "250", lowStockThreshold: 15 },
    ],
    EATERY: [
      { name: "Chapati", price: "30", lowStockThreshold: 30 },
      { name: "Stew plate", price: "200", lowStockThreshold: 10 },
    ],
    SERVICE: [{ name: "Consultation", price: "1500", lowStockThreshold: 1 }],
  };
  return map[layout] ?? [];
}

function normalizeFirstItems(firstItems: unknown) {
  const list = Array.isArray(firstItems) ? firstItems : [firstItems];
  return list
    .map((firstItem) => {
      if (!firstItem || typeof firstItem !== "object") return null;
      const { name, price, wholesalePrice, lowStockThreshold } =
        firstItem as Record<string, string>;
      if (!name || !price) return null;

      const priceDecimal = toDecimalOrNull(price);
      if (!priceDecimal) return null;

      return {
        name,
        price: priceDecimal.toString(),
        wholesalePrice: wholesalePrice
          ? toDecimalOrNull(wholesalePrice)?.toString()
          : undefined,
        lowStockThreshold: lowStockThreshold
          ? Number(lowStockThreshold)
          : undefined,
      };
    })
    .filter(Boolean) as {
    name: string;
    price: string;
    wholesalePrice?: string;
    lowStockThreshold?: number;
  }[];
}
