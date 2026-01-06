import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const status = body?.status;
    if (!["ACTIVE", "PENDING", "SUSPENDED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }
    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("[PATCH /api/admin/tenants/:id/status]", error);
    return NextResponse.json(
      { error: "Could not update tenant status." },
      { status: 500 },
    );
  }
}
