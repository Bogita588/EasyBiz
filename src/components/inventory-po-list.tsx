"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "@/app/inventory/inventory.module.css";

type POLine = {
  item?: { name: string | null } | null;
  quantity: number;
  unitCost?: { toString(): string } | null;
};

type PO = {
  id: string;
  status: string;
  total: unknown;
  needBy: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  supplier?: { name: string | null } | null;
  lines: POLine[];
};

type Props = { purchaseOrders: PO[] };

export function InventoryPOList({ purchaseOrders }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<string, string>>({});

  const mark = (poId: string, amount?: number | null) => {
    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetch(`/api/purchase-orders/${poId}/mark-paid`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            amount === undefined ? {} : { amount: amount === null ? null : amount },
          ),
        });
        if (!res.ok) throw new Error();
        setMessage(
          amount === undefined
            ? "Marked as received (unpaid)."
            : amount === null
              ? "Marked as received."
              : "Payment recorded.",
        );
        router.refresh();
      } catch {
        setMessage("Could not update order.");
      }
    });
  };

  return (
    <section className={styles.card}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.kicker}>Purchase orders</p>
          <h2 className={styles.title}>Orders placed</h2>
        </div>
        <p className={styles.meta}>Latest {purchaseOrders.length} orders</p>
      </div>
      <div className={styles.poList}>
        {purchaseOrders.map((po) => {
          const line = po.lines[0];
          const unitCost = line?.unitCost ? Number(line.unitCost as unknown as string) : null;
          const needByStr = po.needBy ? po.needBy.slice(0, 10) : "—";
          const dueStr = po.dueDate ? po.dueDate.slice(0, 10) : "—";
          const createdStr = po.createdAt.slice(0, 10);
          const isDelayed =
            po.needBy && !po.paidAt && new Date(po.needBy) < new Date();
          const amountValue = amounts[po.id] ?? "";
          return (
            <div key={po.id} className={styles.poRow}>
              <div>
                <p className={styles.name}>
                  {po.supplier?.name || "Supplier"} • {po.status}
                  {isDelayed && <span className={styles.late}>Delayed</span>}
                </p>
                <p className={styles.meta}>
                  {line?.item?.name || "Item"} • Qty {line?.quantity ?? "?"}
                  {unitCost ? ` • Unit KES ${unitCost.toLocaleString()}` : ""} • Total KES{" "}
                  {Number(po.total || 0).toLocaleString()}
                </p>
                <p className={styles.meta}>
                  Need by {needByStr} • Due {dueStr} • Created {createdStr}
                </p>
              </div>
                <div className={styles.statusBlock}>
                  <span className={styles.statusPill}>{po.status}</span>
                  <span className={styles.meta}>
                    {po.paidAt ? `Received ${po.paidAt.slice(0, 10)}` : "Not received"}
                  </span>
                {!po.paidAt && (
                  <>
                    <label className={styles.label}>
                      Payment amount (optional)
                      <input
                        className={styles.input}
                        type="number"
                        min={0}
                        value={amountValue}
                        onChange={(e) =>
                          setAmounts((prev) => ({ ...prev, [po.id]: e.target.value }))
                        }
                        placeholder="KES"
                      />
                    </label>
                    <div className={styles.poActions}>
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={pending}
                        onClick={() => mark(po.id)}
                      >
                        Mark delivered (unpaid)
                      </button>
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={pending}
                        onClick={() => mark(po.id, Number(po.total || 0))}
                      >
                        Mark paid in full
                      </button>
                      <button
                        type="button"
                        className={styles.primary}
                        disabled={pending || !amountValue}
                        onClick={() => mark(po.id, Number(amountValue))}
                      >
                        Record partial
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {purchaseOrders.length === 0 && (
          <p className={styles.meta}>No purchase orders yet.</p>
        )}
      </div>
      {message && <p className={styles.helper}>{message}</p>}
    </section>
  );
}
