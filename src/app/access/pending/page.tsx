import styles from "../status.module.css";
import { StatusWatcher } from "@/components/status-watcher";

export default function PendingAccess() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Pending</p>
        <h1 className={styles.title}>Your ERP is pending approval</h1>
        <p className={styles.subtitle}>
          We&apos;ve received your request. An admin will approve your business soon.
        </p>
        <StatusWatcher />
      </div>
    </div>
  );
}
