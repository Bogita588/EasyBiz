"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./onboarding.module.css";

type PaymentType = "till" | "paybill" | "pochi" | "cash";

type FormState = {
  businessType: string;
  layout: "DUKA" | "SALON" | "HARDWARE" | "EATERY" | "SERVICE" | "GENERIC";
  businessName: string;
  items: { name: string; price: string }[];
  paymentNumber: string;
  paymentType: PaymentType;
};

const steps = [
  {
    id: "businessType",
    title: "Let’s set up your business.",
    question: "What do you sell or do?",
    placeholder: "E.g., salon, hardware, nyama choma",
  },
  {
    id: "layout",
    title: "Pick a layout",
    question: "Choose a template close to your business",
    placeholder: "",
  },
  {
    id: "businessName",
    title: "What should we call your business?",
    question: "Business name",
    placeholder: "E.g., Rahisi Duka",
  },
  {
    id: "item",
    title: "Add your first item or service.",
    question: "Item name and price (KES)",
    placeholder: "E.g., Sugar (1kg)",
  },
  {
    id: "payment",
    title: "How do you get paid?",
    question: "Enter your M-Pesa till / paybill / Pochi number.",
    placeholder: "E.g., 123456",
  },
  {
    id: "ready",
    title: "All set to start.",
    question: "You can add more anytime.",
    placeholder: "",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    businessType: "",
    layout: "GENERIC",
    businessName: "",
    items: [{ name: "", price: "" }],
    paymentNumber: "",
    paymentType: "till",
  });

  useEffect(() => {
    if (tenantId) return;
    const match = document.cookie.match(/ez_session=([^;]+)/);
    if (!match) return;
    try {
      const json = JSON.parse(atob(match[1]));
      if (json?.tenantId) {
        setTenantId(json.tenantId);
      }
    } catch {
      // ignore
    }
  }, [tenantId]);

  const currentStep = steps[stepIndex];

  const isLastStep = useMemo(() => stepIndex === steps.length - 1, [stepIndex]);

  const handleContinue = async (skip = false) => {
    setIsSaving(true);
    setStatus(null);

    try {
      const payload = buildPayload(currentStep.id, form, skip);

      const response = await upsertTenant({
        tenantId,
        payload,
      });

      if (response?.tenantId) {
        setTenantId(response.tenantId);
      }

      if (isLastStep) {
        router.push("/home");
        return;
      }

      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (error) {
      setStatus("Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <p className={styles.kicker}>Onboarding • Step {stepIndex + 1}/5</p>
        <h1 className={styles.title}>{currentStep.title}</h1>
        <p className={styles.subtitle}>{currentStep.question}</p>
      </div>

      <div className={styles.card}>
        {currentStep.id === "businessType" && (
          <input
            className={styles.input}
            placeholder={currentStep.placeholder}
            value={form.businessType}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, businessType: e.target.value }))
            }
            autoFocus
          />
        )}

        {currentStep.id === "businessName" && (
          <input
            className={styles.input}
            placeholder={currentStep.placeholder}
            value={form.businessName}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, businessName: e.target.value }))
            }
            autoFocus
          />
        )}

        {currentStep.id === "layout" && (
          <div className={styles.pillRow}>
            {[
              { key: "DUKA", label: "Duka" },
              { key: "SALON", label: "Salon" },
              { key: "HARDWARE", label: "Hardware" },
              { key: "EATERY", label: "Eatery" },
              { key: "SERVICE", label: "Services" },
              { key: "GENERIC", label: "Generic" },
            ].map((opt) => (
              <button
                key={opt.key}
                className={`${styles.pill} ${form.layout === opt.key ? styles.pillActive : ""}`}
                onClick={() => setForm((prev) => ({ ...prev, layout: opt.key as FormState["layout"] }))}
                type="button"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {currentStep.id === "item" && (
          <div className={styles.stack}>
            {form.items.map((item, index) => (
              <div key={index} className={styles.row}>
                <input
                  className={styles.input}
                  placeholder="Item name"
                  value={item.name}
                  onChange={(e) =>
                    setForm((prev) => {
                      const next = [...prev.items];
                      next[index] = { ...next[index], name: e.target.value };
                      return { ...prev, items: next };
                    })
                  }
                  autoFocus={index === 0}
                />
                <input
                  className={styles.input}
                  placeholder="Price (KES)"
                  value={item.price}
                  inputMode="decimal"
                  onChange={(e) =>
                    setForm((prev) => {
                      const next = [...prev.items];
                      next[index] = { ...next[index], price: e.target.value };
                      return { ...prev, items: next };
                    })
                  }
                />
                {form.items.length > 1 && (
                  <button
                    className={styles.remove}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index),
                      }))
                    }
                    type="button"
                    aria-label="Remove item"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              className={styles.ghost}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  items: [...prev.items, { name: "", price: "" }],
                }))
              }
              type="button"
            >
              + Add another item
            </button>
          </div>
        )}

        {currentStep.id === "payment" && (
          <div className={styles.stack}>
            <div className={styles.pillRow}>
              {(["till", "paybill", "pochi", "cash"] as PaymentType[]).map(
                (type) => (
                  <button
                    key={type}
                    className={`${styles.pill} ${
                      form.paymentType === type ? styles.pillActive : ""
                    }`}
                    onClick={() =>
                      setForm((prev) => ({ ...prev, paymentType: type }))
                    }
                    type="button"
                  >
                    {labelForPayment(type)}
                  </button>
                ),
              )}
            </div>
            {form.paymentType !== "cash" ? (
              <>
                <input
                  className={styles.input}
                  placeholder={currentStep.placeholder}
                  value={form.paymentNumber}
                  inputMode="numeric"
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      paymentNumber: e.target.value,
                    }))
                  }
                  autoFocus
                />
                <p className={styles.helper}>
                  We’ll use this to request and confirm payments. You can change
                  it later.
                </p>
              </>
            ) : (
              <p className={styles.helper}>
                We’ll track cash payments. You can add M-Pesa later.
              </p>
            )}
          </div>
        )}

        {currentStep.id === "ready" && (
          <div className={styles.ready}>
            <p>Business set. You can add more anytime.</p>
            <ul>
              <li>One-tap invoicing and M-Pesa requests</li>
              <li>Home shows today’s sales and low stock</li>
              <li>Works offline; syncs quietly</li>
            </ul>
          </div>
        )}
      </div>

      {status && <p className={styles.status}>{status}</p>}

      <div className={styles.actions}>
        <button
          className={styles.secondary}
          onClick={handleBack}
          disabled={stepIndex === 0 || isSaving}
        >
          Back
        </button>
        <div className={styles.primaryGroup}>
          <button
            className={styles.ghost}
            onClick={() => handleContinue(true)}
            disabled={isSaving}
          >
            Skip for now
          </button>
          <button
            className={styles.primary}
            onClick={() => handleContinue(false)}
            disabled={isSaving}
          >
            {isLastStep ? "Go to home" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

function labelForPayment(type: PaymentType) {
  if (type === "till") return "Till";
  if (type === "paybill") return "Paybill";
  if (type === "pochi") return "Pochi";
  return "Cash";
}

function buildPayload(
  stepId: (typeof steps)[number]["id"],
  form: FormState,
  skip: boolean,
) {
  if (skip) return {};

  if (stepId === "businessType") {
    return { businessType: form.businessType.trim() || null };
  }

  if (stepId === "layout") {
    return { layout: form.layout || "GENERIC" };
  }

  if (stepId === "businessName") {
    return { businessName: form.businessName.trim() || null };
  }

  if (stepId === "item") {
    const validItems = form.items
      .map((item) => ({
        name: item.name.trim(),
        price: item.price.replace(/,/g, "").trim(),
      }))
      .filter((item) => item.name && item.price);
    if (!validItems.length) return {};
    return { firstItems: validItems };
  }

  if (stepId === "payment") {
    if (form.paymentType === "cash") {
      return { payment: { acceptsCash: true } };
    }
    if (!form.paymentNumber.trim()) return {};
    return { payment: mapPayment(form.paymentType, form.paymentNumber.trim()) };
  }

  return {};
}

function mapPayment(type: PaymentType, number: string) {
  if (type === "till") return { mpesaTill: number };
  if (type === "paybill") return { mpesaPaybill: number };
  if (type === "pochi") return { mpesaPochi: number };
  return { acceptsCash: true };
}

async function upsertTenant({
  tenantId,
  payload,
}: {
  tenantId: string | null;
  payload: Record<string, unknown>;
}) {
  const body = JSON.stringify(payload);

  const res = await fetch(tenantId ? `/api/tenants/${tenantId}` : "/api/tenants", {
    method: tenantId ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "Failed to save");
  }

  return res.json();
}
