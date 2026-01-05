import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantId = await getTenantId();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);

    const [payments, invoices, pos, lowStockRaw] = await Promise.all([
      prisma.payment.findMany({
        where: { tenantId, confirmedAt: { gte: start, lt: end } },
        select: { amount: true, method: true },
      }),
      prisma.invoice.findMany({
        where: { tenantId, issuedAt: { gte: start, lt: end } },
        select: {
          id: true,
          status: true,
          total: true,
          customer: { select: { name: true } },
          lines: { select: { description: true, quantity: true } },
        },
        orderBy: { issuedAt: "desc" },
      }),
      prisma.purchaseOrder.findMany({
        where: { tenantId, createdAt: { gte: start, lt: end } },
        select: {
          id: true,
          total: true,
          needBy: true,
          dueDate: true,
          status: true,
          supplier: { select: { name: true } },
          lines: { select: { quantity: true, item: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.item.findMany({
        where: { tenantId },
        select: {
          name: true,
          stockQuantity: true,
          lowStockThreshold: true,
          preferredSupplier: { select: { name: true } },
        },
      }),
    ]);

    const lowStock = lowStockRaw.filter(
      (i) => i.stockQuantity <= i.lowStockThreshold,
    );

    const paymentTotal = payments.reduce(
      (sum, p) => sum + Number(p.amount || 0),
      0,
    );
    const paymentByMethod = payments.reduce<Record<string, number>>((acc, p) => {
      const key = p.method;
      acc[key] = (acc[key] || 0) + Number(p.amount || 0);
      return acc;
    }, {});

    const receivables = await prisma.invoice.aggregate({
      where: { tenantId, status: { not: "PAID" } },
      _sum: { total: true },
    });
    const payablesAgg = await prisma.purchaseOrder.aggregate({
      where: { tenantId, paidAt: null },
      _sum: { total: true },
    });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    const margin = 40;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    let y = height - margin;

    const drawLine = (text: string, size = 11, gap = 14) => {
      if (y < margin + size) {
        const newPage = pdfDoc.addPage();
        y = newPage.getSize().height - margin;
        newPage.setFont(font);
      }
      page.drawText(text, { x: margin, y, size, font });
      y -= gap;
    };

    drawLine("Daily Business Report", 18, 20);
    drawLine(`Date: ${start.toISOString().slice(0, 10)}`, 12, 18);
    drawLine("Summary", 14, 16);
    drawLine(`Payments collected: KES ${paymentTotal.toLocaleString()}`);
    Object.entries(paymentByMethod).forEach(([method, amt]) =>
      drawLine(`  • ${method}: KES ${amt.toLocaleString()}`),
    );
    drawLine(
      `Receivables (owed to you): KES ${Number(
        receivables._sum.total || 0,
      ).toLocaleString()}`,
    );
    drawLine(
      `Payables (owed to suppliers): KES ${Number(
        payablesAgg._sum.total || 0,
      ).toLocaleString()}`,
    );
    drawLine(`Purchase orders placed: ${pos.length}`);
    drawLine(`Low-stock items: ${lowStock.length}`);
    y -= 6;

    drawLine("Invoices", 14, 16);
    if (!invoices.length) {
      drawLine("No invoices issued today.");
    } else {
      invoices.forEach((inv) => {
        const line = inv.lines[0];
        const lineText = line
          ? `${line.quantity} × ${line.description}`
          : "No line items";
        drawLine(
          `${inv.customer?.name || "Customer"} • ${lineText} • ${inv.status} • KES ${Number(
            inv.total || 0,
          ).toLocaleString()}`,
        );
      });
    }
    y -= 6;

    drawLine("Supplier orders", 14, 16);
    if (!pos.length) {
      drawLine("No purchase orders placed today.");
    } else {
      pos.forEach((po) => {
        const line = po.lines[0];
        const lineText = line?.item?.name
          ? `${line.quantity} × ${line.item.name}`
          : "Order";
        const timing = [
          po.needBy ? `need by ${po.needBy.toISOString().slice(0, 10)}` : null,
          po.dueDate ? `due ${po.dueDate.toISOString().slice(0, 10)}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        drawLine(
          `${po.supplier?.name || "Supplier"} • ${lineText} • ${po.status}${
            timing ? ` • ${timing}` : ""
          } • KES ${Number(po.total || 0).toLocaleString()}`,
        );
      });
    }
    y -= 6;

    drawLine("Low-stock alerts", 14, 16);
    if (!lowStock.length) {
      drawLine("No low-stock items today.");
    } else {
      lowStock.forEach((item) => {
        drawLine(
          `${item.name}: ${item.stockQuantity}/${item.lowStockThreshold}${
            item.preferredSupplier ? ` • Supplier: ${item.preferredSupplier.name}` : ""
          }`,
        );
      });
    }

    const pdfBytes = await pdfDoc.save();
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="daily-report.pdf"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/daily/pdf]", error);
    return NextResponse.json(
      { error: "Could not generate PDF report." },
      { status: 500 },
    );
  }
}
