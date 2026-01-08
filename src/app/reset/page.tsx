import Link from "next/link";
import styles from "./reset.module.css";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Password help</p>
        <h1 className={styles.title}>Reset your access</h1>
        <p className={styles.subtitle}>
          Password reset by email/WhatsApp is coming. For now, ask your admin to set a new
          password for you, or request a reset link from support.
        </p>
        <ul className={styles.list}>
          <li>Owners/Admins: open Users page and set a new password for the teammate.</li>
          <li>Staff: contact your owner or platform admin to reset your password.</li>
        </ul>
        <Link className={styles.primary} href="/login">Back to login</Link>
      </div>
    </div>
  );
}
