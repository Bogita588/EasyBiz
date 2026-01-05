import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toDecimalOrNull } from "@/lib/sanitize";
import { UserRole } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const businessType = body?.businessType ?? null;
    const businessName = body?.businessName ?? "My business";
    const payment: PaymentPayload = body?.payment ?? {};
    const firstItems = normalizeFirstItems(body?.firstItems ?? body?.firstItem);

    const tenant = await prisma.tenant.create({
      data: buildTenantCreateData({
        businessName,
        businessType,
        payment,
        firstItems,
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
  payment,
  firstItems,
}: {
  businessName: string;
  businessType: string | null;
  payment: PaymentPayload;
  firstItems: ItemInput[];
}) {
  return {
    name: businessName,
    businessType: businessType,
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
