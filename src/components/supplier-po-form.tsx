"use client";

import { useState } from "react";
import styles from "./supplier-po-form.module.css";

type ItemOption = {
  id: string;
  name: string;
  price: number;
  stockQuantity: number;
};

type Props = {
  supplierId: string;
  supplierName: string;
  items: ItemOption[];
};

export function SupplierPOForm({ supplierId, supplierName, items }: Props) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [quantity, setQuantity] = useState<number>(1);
  const [needBy, setNeedBy] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          itemId,
          quantity,
          needBy: needBy || undefined,
          dueDate: dueDate || undefined,
          unitCost: unitCost || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Create failed");
      }
      setStatus("PO created and logged. Share via inventory actions if needed.");
      setQuantity(1);
      setNeedBy("");
      setDueDate("");
      setUnitCost("");
    } catch {
      setStatus("Could not create PO.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <p className={styles.label}>Create purchase order for {supplierName}</p>
      <div className={styles.grid}>
        <select
          className={styles.input}
          value={itemId}
          onChange={(e) => setItemId(e.target.value)}
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} • KES {Number(item.price).toLocaleString()} • In stock {item.stockQuantity}
            </option>
          ))}
        </select>
        <input
          className={styles.input}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value) || 1)}
          placeholder="Quantity"
        />
        <input
          className={styles.input}
          placeholder="Unit cost (optional)"
          value={unitCost}
          onChange={(e) => setUnitCost(e.target.value)}
        />
        <input
          className={styles.input}
          type="date"
          value={needBy}
          onChange={(e) => setNeedBy(e.target.value)}
          placeholder="Need by"
        />
        <input
          className={styles.input}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          placeholder="Due date"
        />
        <button
          className={styles.primary}
          type="button"
          onClick={submit}
          disabled={busy || !itemId}
        >
          Create PO
        </button>
      </div>
      {status && <p className={styles.status}>{status}</p>}
    </div>
  );
}
