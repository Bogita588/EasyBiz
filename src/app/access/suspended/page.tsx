import styles from "../status.module.css";
import { StatusWatcher } from "@/components/status-watcher";

export default function SuspendedAccess() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Suspended</p>
        <h1 className={styles.title}>Account suspended</h1>
        <p className={styles.subtitle}>
          Your ERP access is suspended. Contact admin to restore access.
        </p>
        <StatusWatcher />
      </div>
    </div>
  );
}
