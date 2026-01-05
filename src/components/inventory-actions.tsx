"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./inventory-actions.module.css";

type Props = {
  itemId: string;
  itemName: string;
  suggestedQty: number;
  supplierId?: string;
  suppliers: { id: string; name: string; phone?: string | null; email?: string | null; whatsapp?: string | null }[];
};

export function InventoryActions({
  itemId,
  itemName,
  suggestedQty,
  supplierId,
  suppliers,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(suggestedQty);
  const [needBy, setNeedBy] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>(
    supplierId ?? suppliers[0]?.id,
  );
  const [lastPo, setLastPo] = useState<{ id: string } | null>(null);
  const currentSupplier = () =>
    suppliers.find((s) => s.id === selectedSupplier);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(timer);
  }, [message]);

  const reorder = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (!qty || qty <= 0) {
        setMessage("Enter a quantity.");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          quantity: qty,
          supplierId: selectedSupplier,
          needBy: needBy || undefined,
          unitCost: 0,
          dueDate: dueDate || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLastPo({ id: data.purchaseOrderId });
      setMessage(`Order placed for ${qty} × ${itemName}.`);
      router.refresh();
    } catch {
      setMessage("Could not place order. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.inputs}>
        <label className={styles.label}>
          Quantity
          <input
            className={styles.input}
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
          />
        </label>
        <label className={styles.label}>
          Due date
          <input
            className={styles.input}
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </label>
        <label className={styles.label}>
          Need by
          <input
            className={styles.input}
            type="date"
            value={needBy}
            onChange={(e) => setNeedBy(e.target.value)}
          />
        </label>
        <label className={styles.label}>
          Supplier
          <select
            className={styles.input}
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          onClick={reorder}
          disabled={busy}
          className={styles.primary}
        >
          Place order
        </button>
      </div>
      {message && <div className={styles.toast}>{message}</div>}
      {lastPo && (
        <div className={styles.shareRow}>
          {currentSupplier()?.whatsapp ? (
            <a
              className={styles.shareButton}
              href={`https://wa.me/${currentSupplier()?.whatsapp}?text=${encodeURIComponent(
                `Purchase order ${lastPo.id} for ${qty} × ${itemName}.${
                  needBy ? ` Need by ${needBy}.` : ""
                }${dueDate ? ` Due ${dueDate}.` : ""}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Send PO via WhatsApp
            </a>
          ) : (
            <a
              className={styles.shareButton}
              href={`https://wa.me/?text=${encodeURIComponent(
                `Purchase order ${lastPo.id} for ${qty} × ${itemName}.${
                  needBy ? ` Need by ${needBy}.` : ""
                }${dueDate ? ` Due ${dueDate}.` : ""}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Send PO via WhatsApp
            </a>
          )}
          <a
            className={styles.shareButton}
            href={`mailto:${currentSupplier()?.email || ""}?subject=Purchase%20Order%20${lastPo.id}&body=${encodeURIComponent(
              `Hi,\n\nHere is purchase order ${lastPo.id} for ${qty} × ${itemName}.${
                needBy ? ` Need by ${needBy}.` : ""
              }${dueDate ? ` Due ${dueDate}.` : ""}\n\nThank you.`,
            )}`}
          >
            Send PO via Email
          </a>
          {currentSupplier()?.phone && (
            <span className={styles.meta}>
              Call/SMS: {currentSupplier()?.phone}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
