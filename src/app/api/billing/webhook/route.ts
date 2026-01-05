import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-billing-signature");
    if (!signature || signature !== process.env.BILLING_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const tenantId = body?.tenantId as string | undefined;
    const plan = body?.plan as string | undefined;
    const status = body?.status as string | undefined;
    if (!tenantId || !plan) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        businessType: status ? `${plan}:${status}` : plan,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[POST /api/billing/webhook]", error);
    return NextResponse.json({ error: "Failed to process webhook" }, { status: 500 });
  }
}
