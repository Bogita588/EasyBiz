import styles from "./page.module.css";
import { copy } from "@/lib/copy";
import { getFeed, getSummary } from "@/lib/data";
import { formatCurrencyKES } from "@/lib/format";
import Link from "next/link";

export default async function Home() {
  const [summary, feed] = await Promise.all([getSummary(), getFeed()]);

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
      </header>

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
