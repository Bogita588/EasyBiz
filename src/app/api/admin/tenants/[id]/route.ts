import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing tenant id." }, { status: 400 });

  try {
    // Cascade delete in safe order
    await prisma.activityEvent.deleteMany({ where: { tenantId: id } });
    await prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrder: { tenantId: id } } });
    await prisma.invoiceLine.deleteMany({ where: { invoice: { tenantId: id } } });
    await prisma.payment.deleteMany({ where: { tenantId: id } });
    await prisma.purchaseOrder.deleteMany({ where: { tenantId: id } });
    await prisma.invoice.deleteMany({ where: { tenantId: id } });
    await prisma.item.deleteMany({ where: { tenantId: id } });
    await prisma.customer.deleteMany({ where: { tenantId: id } });
    await prisma.supplier.deleteMany({ where: { tenantId: id } });
    await prisma.user.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.deleteMany({ where: { id } });

    await logAudit({ tenantId: id, action: "tenant_deleted" });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/tenants/:id]", error);
    return NextResponse.json({ error: "Could not delete tenant." }, { status: 500 });
  }
}
