import styles from "../page.module.css";
import { copy } from "@/lib/copy";
import { getFeed, getLowStockAlerts, getSummary } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import Link from "next/link";
import { RefreshAlertsButton } from "@/components/refresh-alerts";
import { redirect } from "next/navigation";
import { getTenantId } from "@/lib/data";

export default async function Home() {
  try {
    await getTenantId(); // ensure session is present; middleware should guard, but double-check to avoid 500s.
  } catch {
    redirect("/login");
  }

  const [summary, feed, alerts] = await Promise.all([
    getSummary(),
    getFeed(),
    getLowStockAlerts(),
  ]);

  const stats = [
    {
      label: "Cash + M-Pesa today",
      value: formatCurrencyKES(summary.soldToday),
      hint: `Cash ${formatCurrencyKES(summary.cashToday)}, M-Pesa ${formatCurrencyKES(summary.mpesaToday)}`,
    },
    {
      label: "Owed to you",
      value: formatCurrencyKES(summary.owed),
      hint: "Top debtors shown in Money",
    },
    {
      label: "Owed to suppliers",
      value: formatCurrencyKES(summary.payables),
      hint: "Payables from purchase orders",
    },
    {
      label: "Low stock",
      value: `${summary.lowStockCount} items`,
      hint: "Tap alerts to reorder",
    },
  ];

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Home • Today</p>
          <h1 className={styles.title}>{copy.appName}</h1>
          <p className={styles.tagline}>
            WhatsApp-smooth ERP for Nairobi SMEs. One tap, clear copy, offline
            friendly.
          </p>
        </div>
        <span className={styles.badge}>Offline-ready</span>
        <a className={styles.download} href="/api/reports/daily/pdf">
          Download daily PDF
        </a>
      </header>

      <div className={styles.columns}>
        <div className={styles.mainColumn}>
          <section className={styles.summaryCard}>
            <p className={styles.summaryLabel}>Today</p>
            <p className={styles.summaryText}>{summary.summaryText}</p>
            <div className={styles.ctaRow}>
              <Link href="/invoice/new" className={styles.primaryCta}>
                {copy.home.ctaPrimary}
              </Link>
              <Link href="/money" className={styles.secondaryCta}>
                {copy.home.ctaSecondary}
              </Link>
              <Link href="/inventory" className={styles.secondaryCta}>
                Manage inventory
              </Link>
            </div>
          </section>

          <section className={styles.tiles}>
            {stats.map((stat) => (
              <article key={stat.label} className={styles.tile}>
                <p className={styles.tileLabel}>{stat.label}</p>
                <p className={styles.tileValue}>{stat.value}</p>
                <p className={styles.tileHint}>{stat.hint}</p>
              </article>
            ))}
          </section>

          {alerts.length > 0 && (
            <section className={styles.alertSection}>
              <div className={styles.sectionHeader}>
                <div>
                  <p className={styles.sectionKicker}>Inventory</p>
                  <h2 className={styles.sectionTitle}>Low stock</h2>
                </div>
                <div className={styles.alertHeaderActions}>
                  <Link href="/inventory" className={styles.sectionHint}>
                    Manage
                  </Link>
                  <RefreshAlertsButton />
                </div>
              </div>
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <article key={alert.id} className={styles.alertCard}>
                    <div>
                      <p className={styles.activityText}>{alert.name}</p>
                      <p className={styles.activityMeta}>
                        In stock {alert.stock} / low at {alert.threshold}
                      </p>
                      {alert.supplier && (
                        <p className={styles.activityMeta}>
                          Supplier: {alert.supplier.name}
                        </p>
                      )}
                    </div>
                    <div className={styles.alertActions}>
                      <Link href="/inventory" className={styles.primaryCta}>
                        Reorder {alert.suggestedQty}
                      </Link>
                      {alert.supplier?.whatsapp && (
                        <a
                          className={styles.secondaryCta}
                          href={`https://wa.me/${alert.supplier.whatsapp}?text=${encodeURIComponent(
                            `${alert.name} is low (${alert.stock}/${alert.threshold}). Please deliver ${alert.suggestedQty}.`,
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Notify on WhatsApp
                        </a>
                      )}
                      {alert.supplier?.email && (
                        <a
                          className={styles.secondaryCta}
                          href={`mailto:${alert.supplier.email}?subject=Low%20stock:%20${alert.name}&body=${encodeURIComponent(
                            `${alert.name} is low (${alert.stock}/${alert.threshold}). Please deliver ${alert.suggestedQty}.`,
                          )}`}
                        >
                          Email supplier
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        <section className={styles.activitySection}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionKicker}>Activity</p>
              <h2 className={styles.sectionTitle}>Today&apos;s updates</h2>
            </div>
            <span className={styles.sectionHint}>Latest first</span>
          </div>
          <div className={styles.activityList}>
            {feed.map((activity) => (
              <article
                key={activity.id}
                className={`${styles.activityCard} ${toneClass(activity.type)}`}
              >
                <div className={styles.dot} />
                <div>
                  <p className={styles.activityText}>{activity.text}</p>
                  <p className={styles.activityMeta}>
                    {new Date(activity.ts).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </article>
            ))}
            {feed.length === 0 && (
              <p className={styles.activityMeta}>No activity yet today.</p>
            )}
          </div>
        </section>
      </div>

      <Link href="/invoice/new" className={styles.fab}>
        {copy.home.ctaPrimary}
      </Link>
    </div>
  );
}

function toneClass(type: string) {
  if (type === "PAYMENT") return styles.success;
  if (type === "INVOICE") return styles.info;
  if (type === "STOCK" || type === "PO") return styles.alert;
  return styles.info;
}
