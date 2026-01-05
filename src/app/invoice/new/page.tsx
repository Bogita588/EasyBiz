"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "./invoice.module.css";

type Customer = { id: string; name: string; phone?: string | null };
type Item = {
  id: string;
  name: string;
  price: string;
  wholesalePrice?: string | null;
  stockQuantity: number;
};

type Line = {
  itemId: string | null;
  description: string;
  quantity: number;
  price: string;
};

export default function NewInvoicePage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([
    { itemId: null, description: "", quantity: 1, price: "" },
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestingMpesa, setIsRequestingMpesa] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [cRes, iRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/items"),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setCustomers(data.customers || []);
      }
      if (iRes.ok) {
        const data = await iRes.json();
        setItems(data.items || []);
      }
    };
    load();
  }, []);

  const subtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const priceNum = Number(line.price.toString().replace(/,/g, ""));
      if (!Number.isFinite(priceNum)) return sum;
      return sum + priceNum * (line.quantity || 1);
    }, 0);
  }, [lines]);

  const customerSelected = Boolean(selectedCustomer);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { itemId: null, description: "", quantity: 1, price: "" },
    ]);
  };

  const updateLine = (index: number, partial: Partial<Line>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...partial } : line)),
    );
  };

  const selectItemForLine = (index: number, itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    updateLine(index, {
      itemId,
      description: item.name,
      price: item.price.toString(),
    });
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setStatus(null);
    setInvoiceId(null);
    try {
      if (!customerSelected) {
        setStatus("Pick a customer first.");
        setIsSaving(false);
        return;
      }
      const payload = {
        customerId: selectedCustomer,
        items: lines.map((line) => ({
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity || 1,
          price: line.price,
        })),
      };

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Could not send invoice.");
      }

      const data = await res.json();
      setInvoiceId(data.invoiceId ?? null);
      setStatus("Invoice sent. Waiting for payment.");
    } catch (error) {
      console.error(error);
      setStatus("Could not send invoice. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestMpesa = async () => {
    if (!invoiceId) return;
    setIsRequestingMpesa(true);
    setStatus(null);
    try {
      const res = await fetch("/api/payments/mpesa/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: subtotal,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error?.error || "Could not request M-Pesa payment.");
      }
      setStatus("Payment request sent via M-Pesa.");
    } catch (error) {
      console.error(error);
      setStatus("Could not request M-Pesa payment. Try again.");
    } finally {
      setIsRequestingMpesa(false);
    }
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Invoice • New</p>
          <h1 className={styles.title}>Send an invoice</h1>
        </div>
        <button className={styles.secondary} onClick={addLine} type="button">
          Add item
        </button>
      </header>

      <section className={styles.card}>
        <p className={styles.label}>Customer</p>
        <div className={styles.pillRow}>
          {customers.map((customer) => (
            <button
              key={customer.id}
              className={`${styles.pill} ${
                selectedCustomer === customer.id ? styles.pillActive : ""
              }`}
              onClick={() =>
                setSelectedCustomer((prev) =>
                  prev === customer.id ? null : customer.id,
                )
              }
              type="button"
            >
              {customer.name}
            </button>
          ))}
        </div>
        {!customerSelected && (
          <p className={styles.helper}>Select a customer to send the invoice.</p>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <p className={styles.label}>Items</p>
          <button className={styles.linkButton} onClick={addLine} type="button">
            + Add another
          </button>
        </div>
        <div className={styles.stack}>
          {lines.map((line, index) => (
            <div key={index} className={styles.line}>
              <div className={styles.lineTop}>
                <select
                  className={styles.select}
                  value={line.itemId ?? ""}
                  onChange={(e) => selectItemForLine(index, e.target.value)}
                >
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} • KES {Number(item.price).toLocaleString()}
                    </option>
                  ))}
                </select>
                <input
                  className={styles.input}
                  placeholder="Description"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(index, { description: e.target.value })
                  }
                />
              </div>
              <div className={styles.lineBottom}>
                <input
                  className={styles.input}
                  placeholder="Qty"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, {
                      quantity: Number(e.target.value) || 1,
                    })
                  }
                />
                <input
                  className={styles.input}
                  placeholder="Price (KES)"
                  value={line.price}
                  onChange={(e) => updateLine(index, { price: e.target.value })}
                />
                <button
                  className={styles.remove}
                  onClick={() => removeLine(index)}
                  type="button"
                  aria-label="Remove item"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.rowBetween}>
          <p className={styles.label}>Subtotal</p>
          <p className={styles.total}>KES {subtotal.toLocaleString()}</p>
        </div>
        <p className={styles.helper}>Tax and discounts hidden until needed.</p>
      </section>

      {status && <p className={styles.status}>{status}</p>}

      {invoiceId && (
        <div className={styles.shareCard}>
          <p className={styles.label}>Share</p>
          <div className={styles.shareRow}>
            <a
              className={styles.shareButton}
              href={`https://wa.me/?text=${encodeURIComponent(
                `Invoice ${invoiceId}: settle now ${shareLink(invoiceId)}`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Share via WhatsApp
            </a>
            <a
              className={styles.shareButton}
              href={`mailto:?subject=Invoice%20${invoiceId}&body=${encodeURIComponent(
                `Hi, here is your invoice: ${shareLink(invoiceId)}`,
              )}`}
            >
              Share via Email
            </a>
            <button
              className={styles.shareButton}
              type="button"
              onClick={handleRequestMpesa}
              disabled={isRequestingMpesa}
            >
              {isRequestingMpesa ? "Requesting..." : "Request M-Pesa payment"}
            </button>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.primary}
          onClick={handleSubmit}
          disabled={isSaving || !customerSelected}
        >
          Send invoice
        </button>
        <button
          className={styles.secondary}
          onClick={() => window.history.back()}
          type="button"
        >
          Cancel
        </button>
        {invoiceId && (
          <Link href={`/invoice/${invoiceId}`} className={styles.ghostLink}>
            View invoice
          </Link>
        )}
      </div>
    </div>
  );
}

function shareLink(invoiceId: string) {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/invoice/${invoiceId}`;
  }
  return `/invoice/${invoiceId}`;
}
