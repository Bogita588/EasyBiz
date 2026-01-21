import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TenantStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const allowedStatuses: TenantStatus[] = ["ACTIVE", "PENDING", "SUSPENDED"];

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  try {
    const resolved = "then" in params ? await params : params;
    const id = resolved?.id;
    const body = await request.json().catch(() => ({}));
    const statusRaw = typeof body?.status === "string" ? body.status.toUpperCase() : "";

    if (!id) {
      return NextResponse.json({ error: "Missing tenant id." }, { status: 400 });
    }
    if (!allowedStatuses.includes(statusRaw as TenantStatus)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: { status: statusRaw as TenantStatus },
      select: { id: true, status: true, name: true },
    });

    await logAudit({
      tenantId: id,
      action: "tenant_status_update",
      meta: { status: tenant.status },
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
