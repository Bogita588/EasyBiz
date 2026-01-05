import styles from "./inventory.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { InventoryManager } from "@/components/inventory-manager";
import { InventoryPOList } from "@/components/inventory-po-list";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const tenantId = await getTenantId();
  const items = await prisma.item.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { preferredSupplier: { select: { id: true, name: true } } },
  });
  let suppliers;
  try {
    suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, email: true, whatsapp: true },
    });
  } catch {
    // Fallback for older schemas without email/whatsapp columns.
    suppliers = await prisma.supplier.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true },
    });
  }

  const purchaseOrdersRaw = await prisma.purchaseOrder.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      total: true,
        needBy: true,
        dueDate: true,
        paidAt: true,
        createdAt: true,
        supplier: { select: { name: true } },
      lines: {
        select: {
          quantity: true,
          unitCost: true,
          item: { select: { name: true } },
        },
      },
    },
  });

  const purchaseOrders = purchaseOrdersRaw.map((po) => ({
    id: po.id,
    status: po.status,
    total: Number(po.total || 0),
    needBy: po.needBy ? po.needBy.toISOString() : null,
    dueDate: po.dueDate ? po.dueDate.toISOString() : null,
    paidAt: po.paidAt ? po.paidAt.toISOString() : null,
    createdAt: po.createdAt.toISOString(),
    supplier: po.supplier,
    lines: po.lines.map((line) => ({
      quantity: line.quantity,
      unitCost: Number(line.unitCost || 0),
      item: line.item,
    })),
  }));

  const initialItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    kind: item.kind,
    stockQuantity: item.stockQuantity,
    lowStockThreshold: item.lowStockThreshold,
    preferredSupplier: item.preferredSupplier,
  }));

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Inventory</p>
          <h1 className={styles.title}>Stock at a glance</h1>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.mainCol}>
          <InventoryManager initialItems={initialItems} suppliers={suppliers} />
        </div>
        <aside className={styles.sideCol}>
          <InventoryPOList purchaseOrders={purchaseOrders} />
        </aside>
      </div>
    </div>
  );
}
