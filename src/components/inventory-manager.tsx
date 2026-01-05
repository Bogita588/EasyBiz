"use client";

import { useEffect, useState } from "react";
import styles from "@/app/inventory/inventory.module.css";
import { InventoryActions } from "./inventory-actions";

type Supplier = { id: string; name: string; phone?: string | null; email?: string | null; whatsapp?: string | null };
type Item = {
  id: string;
  name: string;
  category: string | null;
  kind: "PRODUCT" | "SERVICE";
  stockQuantity: number;
  lowStockThreshold: number;
  preferredSupplier?: { id: string; name: string } | null;
};

function itemIcon(name: string, category?: string | null, kind?: string) {
  const key = `${category || ""} ${name}`.toLowerCase();
  if (key.includes("oil")) return "🛢️";
  if (key.includes("sugar")) return "🧂";
  if (key.includes("milk")) return "🥛";
  if (key.includes("bread") || key.includes("flour") || key.includes("maize"))
    return "🍞";
  if (key.includes("rice")) return "🍚";
  if (key.includes("soap") || key.includes("detergent")) return "🧼";
  if (key.includes("water")) return "💧";
  if (key.includes("service")) return "💼";
  if (key.includes("hardware") || key.includes("tool")) return "🛠️";
  if (kind === "SERVICE") return "💼";
  return "📦";
}

type Props = {
  initialItems: Item[];
  suppliers: Supplier[];
};

export function InventoryManager({ initialItems, suppliers }: Props) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [form, setForm] = useState({
    name: "",
    category: "",
    kind: "PRODUCT" as "PRODUCT" | "SERVICE",
    price: "",
    lowStockThreshold: 5,
    preferredSupplierId: suppliers[0]?.id ?? "",
  });
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  const handleCreate = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          category: form.category || null,
          kind: form.kind,
          price: form.price,
          lowStockThreshold: form.lowStockThreshold,
          preferredSupplierId: form.preferredSupplierId || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Create failed");
      }
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setMessage("Item added.");
      setForm((prev) => ({
        ...prev,
        name: "",
        category: "",
        price: "",
      }));
    } catch {
      setMessage("Could not add item.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => i.id !== id));
      setMessage("Item deleted.");
    } catch {
      setMessage("Could not delete item.");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateThreshold = async (id: string, value: number) => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lowStockThreshold: value }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, lowStockThreshold: data.item.lowStockThreshold } : i)),
      );
      setMessage("Threshold updated.");
    } catch {
      setMessage("Could not update threshold.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.manager}>
      <div className={styles.card}>
        <p className={styles.label}>Add item or service</p>
        <div className={styles.managerForm}>
          <input
            className={styles.input}
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
          <input
            className={styles.input}
            placeholder="Category (optional)"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          />
          <input
            className={styles.input}
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
          />
          <select
            className={styles.input}
            value={form.kind}
            onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as "PRODUCT" | "SERVICE" }))}
          >
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
          </select>
          <input
            className={styles.input}
            type="number"
            min={1}
            value={form.lowStockThreshold}
            onChange={(e) =>
              setForm((p) => ({ ...p, lowStockThreshold: Number(e.target.value) || 1 }))
            }
            placeholder="Low stock threshold"
          />
          <select
            className={styles.input}
            value={form.preferredSupplierId}
            onChange={(e) => setForm((p) => ({ ...p, preferredSupplierId: e.target.value }))}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
            <option value="">No supplier</option>
          </select>
          <button
            className={styles.primary}
            type="button"
            onClick={handleCreate}
            disabled={busy}
          >
            Add
          </button>
        </div>
      </div>

      <div className={styles.list}>
        {items.map((item) => {
          const isLow = item.stockQuantity <= item.lowStockThreshold;
          return (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div className={styles.iconBadge}>{itemIcon(item.name, item.category, item.kind)}</div>
                <div className={styles.cardTopBody}>
                  <div>
                    <p className={styles.name}>{item.name}</p>
                    <p className={styles.meta}>
                      {item.kind.toLowerCase()} • {item.category || "Uncategorized"}
                    </p>
                    <p className={styles.meta}>
                      In stock: {item.stockQuantity} • Low at {item.lowStockThreshold}
                    </p>
                    {item.preferredSupplier && (
                      <p className={styles.meta}>Supplier: {item.preferredSupplier.name}</p>
                    )}
                  </div>
                  {isLow && <span className={styles.badge}>Low</span>}
                </div>
              </div>
              <div className={styles.inlineControls}>
                <label className={styles.label}>
                  Low stock
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    value={item.lowStockThreshold}
                    onChange={(e) =>
                      handleUpdateThreshold(item.id, Number(e.target.value) || item.lowStockThreshold)
                    }
                  />
                </label>
                <button
                  type="button"
                  className={styles.danger}
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                >
                  Delete
                </button>
              </div>
              <InventoryActions
                itemId={item.id}
                itemName={item.name}
                suggestedQty={Math.max(item.lowStockThreshold * 2 - item.stockQuantity, 5)}
                supplierId={item.preferredSupplier?.id}
                suppliers={suppliers}
              />
            </article>
          );
        })}
      </div>
      {message && <div className={styles.toast}>{message}</div>}
    </div>
  );
}
