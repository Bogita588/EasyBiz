import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayStart.getDate() + 1);

    const payments = await prisma.payment.findMany({
      where: { tenantId, confirmedAt: { gte: todayStart, lt: todayEnd } },
      select: { amount: true, method: true },
    });
    const invoices = await prisma.invoice.findMany({
      where: { tenantId, issuedAt: { gte: todayStart, lt: todayEnd } },
      select: { id: true, total: true, status: true },
    });
    const pos = await prisma.purchaseOrder.findMany({
      where: { tenantId, createdAt: { gte: todayStart, lt: todayEnd } },
      select: {
        id: true,
        total: true,
        needBy: true,
        dueDate: true,
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, item: { select: { name: true } } } },
      },
    });

    const csvLines = ["Section,Detail,Value"];
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const paymentTotal = sum(payments.map((p) => Number(p.amount || 0)));
    csvLines.push(`Payments,Total collected today,KES ${paymentTotal}`);
    csvLines.push(
      ...payments.map(
        (p) => `Payments,${p.method},KES ${Number(p.amount || 0)}`,
      ),
    );
    csvLines.push(
      ...invoices.map(
        (inv) =>
          `Invoices,${inv.id} (${inv.status}),KES ${Number(inv.total || 0)}`,
      ),
    );
    csvLines.push(
      ...pos.map((po) => {
        const line = po.lines[0];
        const itemText = line?.item?.name
          ? `${line.quantity} × ${line.item.name}`
          : "Order";
        return `Purchase Orders,${po.id} ${itemText} from ${po.supplier?.name || "supplier"}${
          po.needBy ? ` need-by ${po.needBy.toISOString().slice(0, 10)}` : ""
        }${po.dueDate ? ` due ${po.dueDate.toISOString().slice(0, 10)}` : ""},KES ${Number(po.total || 0)}`;
      }),
    );

    const csv = csvLines.join("\n");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="daily-report.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/daily]", error);
    return NextResponse.json(
      { error: "Could not build report." },
      { status: 500 },
    );
  }
}
