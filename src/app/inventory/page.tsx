import styles from "./inventory.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { InventoryManager } from "@/components/inventory-manager";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const tenantId = await getTenantId();
  const items = await prisma.item.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    include: { preferredSupplier: { select: { id: true, name: true } } },
  });
  const suppliers = await prisma.supplier.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, phone: true, email: true, whatsapp: true },
  });

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

      <InventoryManager initialItems={initialItems} suppliers={suppliers} />
    </div>
  );
}
