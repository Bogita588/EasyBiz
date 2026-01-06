import styles from "./register.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function RegisterChoice() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Get started</p>
        <h1 className={styles.title}>Choose your entry</h1>
        <p className={styles.subtitle}>Admins manage tenants; businesses run the ERP.</p>
        <div className={styles.actions}>
          <Link className={styles.primary} href="/signup">
            I am a business (request access)
          </Link>
          <Link className={styles.secondary} href="/login">
            I am an admin (sign in)
          </Link>
        </div>
      </div>
    </div>
  );
}
