import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimalOrNull } from "@/lib/sanitize";
import { LayoutPreset, UserRole } from "@prisma/client";

const allowedLayouts: LayoutPreset[] = ["GENERIC", "DUKA", "SALON", "HARDWARE", "EATERY", "SERVICE"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessType = body?.businessType ?? null;
    const layoutRaw = (body?.layout as string | undefined)?.toUpperCase();
    const layout: LayoutPreset = allowedLayouts.includes(layoutRaw as LayoutPreset)
      ? (layoutRaw as LayoutPreset)
      : "GENERIC";
    const businessName = body?.businessName ?? "My business";
    const payment: PaymentPayload = body?.payment ?? {};
    const firstItems = normalizeFirstItems(body?.firstItems ?? body?.firstItem);
    const presetItems = firstItems.length ? [] : presetForLayout(layout || "GENERIC");

    const tenant = await prisma.tenant.create({
      data: buildTenantCreateData({
        businessName,
        businessType,
        layout,
        payment,
        firstItems: firstItems.length ? firstItems : presetItems,
      }),
      select: { id: true },
    });

    return NextResponse.json(
      { tenantId: tenant.id, message: "Tenant created." },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/tenants]", error);
    return NextResponse.json(
      { error: "Could not create tenant." },
      { status: 500 },
    );
  }
}

function buildTenantCreateData({
  businessName,
  businessType,
  layout,
  payment,
  firstItems,
}: {
  businessName: string;
  businessType: string | null;
  layout: LayoutPreset;
  payment: PaymentPayload;
  firstItems: ItemInput[];
}) {
  return {
    name: businessName,
    businessType: businessType,
    layout,
    mpesaTill: payment?.mpesaTill ?? null,
    mpesaPaybill: payment?.mpesaPaybill ?? null,
    mpesaPochi: payment?.mpesaPochi ?? null,
    acceptsCash:
      typeof payment?.acceptsCash === "boolean" ? payment.acceptsCash : true,
    users: {
      create: {
        name: "Owner",
        role: UserRole.OWNER,
      },
    },
    ...(firstItems.length
      ? {
          items: {
            create: firstItems,
          },
        }
      : {}),
  };
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

type ItemInput = {
  name: string;
  price: string;
  wholesalePrice?: string;
  lowStockThreshold?: number;
};

type PaymentPayload = {
  mpesaTill?: string | null;
  mpesaPaybill?: string | null;
  mpesaPochi?: string | null;
  acceptsCash?: boolean;
};

function presetForLayout(layout: string): ItemInput[] {
  const map: Record<string, ItemInput[]> = {
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
    SERVICE: [
      { name: "Consultation", price: "1500", lowStockThreshold: 1 },
    ],
  };
  return map[layout] ?? [];
}
