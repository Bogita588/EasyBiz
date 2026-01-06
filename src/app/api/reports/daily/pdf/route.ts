import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
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

    const [tenant, payments, invoices, pos, lowStockRaw, recentActivity] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, businessType: true },
      }),
      prisma.payment.findMany({
        where: { tenantId, confirmedAt: { gte: start, lt: end } },
        select: {
          amount: true,
          method: true,
          confirmedAt: true,
          createdAt: true,
          invoice: { select: { id: true, customer: { select: { name: true } } } },
        },
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
          paidAmount: true,
          paidAt: true,
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
      prisma.activityEvent.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 8,
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
    const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const brand = { primary: rgb(1, 0.37, 0.32), accent: rgb(0.06, 0.65, 0.91) };

    let page = pdfDoc.addPage();
    let y = page.getSize().height - 50;
    const margin = 32;

    const ensureSpace = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage();
        y = page.getSize().height - 50;
      }
    };

    const drawCard = (title: string, lines: string[]) => {
      const cardHeight = lines.length * 16 + 40;
      ensureSpace(cardHeight + 20);
      page.drawRectangle({
        x: margin,
        y: y - cardHeight,
        width: page.getSize().width - margin * 2,
        height: cardHeight,
        color: rgb(1, 1, 1),
        borderColor: rgb(0.9, 0.93, 0.97),
        borderWidth: 1,
        opacity: 0.98,
        borderOpacity: 0.8,
      });
      page.drawRectangle({
        x: margin,
        y: y - 26,
        width: 6,
        height: 18,
        color: brand.primary,
      });
      page.drawText(title, {
        x: margin + 12,
        y: y - 16,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.12, 0.18),
      });
      let innerY = y - 36;
      lines.forEach((line) => {
        page.drawText(line, {
          x: margin + 12,
          y: innerY,
          size: 10.5,
          font: fontBody,
          color: rgb(0.18, 0.22, 0.3),
        });
        innerY -= 14;
      });
      y = y - cardHeight - 12;
    };

    const headerTitle = tenant?.name || "Daily Business Report";
    page.drawRectangle({
      x: 0,
      y: page.getSize().height - 90,
      width: page.getSize().width,
      height: 90,
      color: rgb(0.99, 0.96, 0.93),
      opacity: 0.9,
    });
    page.drawText(headerTitle, {
      x: margin,
      y: page.getSize().height - 38,
      size: 20,
      font: fontBold,
      color: brand.primary,
    });
    page.drawText(
      `${tenant?.businessType || "Business"} • ${start.toISOString().slice(0, 10)}`,
      {
        x: margin,
        y: page.getSize().height - 58,
        size: 11,
        font: fontBody,
        color: rgb(0.25, 0.28, 0.36),
      },
    );
    y = page.getSize().height - 110;

    const summaryLines = [
      `Payments collected: KES ${paymentTotal.toLocaleString()}`,
      ...Object.entries(paymentByMethod).map(
        ([method, amt]) => `${method}: KES ${amt.toLocaleString()}`,
      ),
      `Receivables (owed to you): KES ${Number(receivables._sum.total || 0).toLocaleString()}`,
      `Payables (owed to suppliers): KES ${Number(payablesAgg._sum.total || 0).toLocaleString()}`,
      `Purchase orders placed today: ${pos.length}`,
      `Low-stock items watching: ${lowStock.length}`,
    ];
    drawCard("Snapshot", summaryLines);

    const invoiceLines = invoices.length
      ? invoices.map((inv) => {
          const line = inv.lines[0];
          const lineText = line ? `${line.quantity} × ${line.description}` : "No line items";
          return `${inv.customer?.name || "Customer"} • ${lineText} • ${inv.status} • KES ${Number(
            inv.total || 0,
          ).toLocaleString()}`;
        })
      : ["No invoices issued today."];
    drawCard("Invoices today", invoiceLines);

    const poLines = pos.length
      ? pos.map((po) => {
          const line = po.lines[0];
          const lineText = line?.item?.name ? `${line.quantity} × ${line.item.name}` : "Order";
          const paid = Number(po.paidAmount || 0);
          const balance = Math.max(0, Number(po.total || 0) - paid);
          const timing = [
            po.needBy ? `need by ${po.needBy.toISOString().slice(0, 10)}` : null,
            po.dueDate ? `due ${po.dueDate.toISOString().slice(0, 10)}` : null,
          ]
            .filter(Boolean)
            .join(" • ");
          let deliveryNote = "Pending delivery";
          if (po.paidAt && (po.needBy || po.dueDate)) {
            const target = po.needBy || po.dueDate;
            deliveryNote = po.paidAt <= target ? "Delivered early/on time" : "Delivered late";
          } else if (po.paidAt) {
            deliveryNote = "Received";
          }
          return `${po.supplier?.name || "Supplier"} • ${lineText} • ${po.status}${
            timing ? ` • ${timing}` : ""
          } • ${deliveryNote} • KES ${Number(po.total || 0).toLocaleString()} • Paid KES ${paid.toLocaleString()} • Balance KES ${balance.toLocaleString()}`;
        })
      : ["No purchase orders placed today."];
    drawCard("Supplier orders & payables", poLines);

    const lowStockLines = lowStock.length
      ? lowStock.map(
          (item) =>
            `${item.name}: ${item.stockQuantity}/${item.lowStockThreshold}${
              item.preferredSupplier ? ` • Supplier: ${item.preferredSupplier.name}` : ""
            }`,
        )
      : ["No low-stock items today."];
    drawCard("Low-stock alerts", lowStockLines);

    const paymentLines = payments.length
      ? payments.map((p) => {
          const ts = p.confirmedAt || p.createdAt;
          const time = ts ? ts.toISOString().slice(11, 16) : "—";
          return `${time} • ${p.method} • KES ${Number(p.amount || 0).toLocaleString()} • ${
            p.invoice?.customer?.name || "Payment"
          }`;
        })
      : ["No payments recorded today."];
    drawCard("Money trail", paymentLines);

    const activityLines = recentActivity.length
      ? recentActivity.map((a) => {
          const time = a.createdAt.toISOString().slice(11, 19);
          return `${time} • ${a.type}: ${a.message}`;
        })
      : ["No recent activity."];
    drawCard("System access & activity", activityLines);

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
