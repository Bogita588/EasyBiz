import Link from "next/link";
import styles from "./reset.module.css";

export const dynamic = "force-dynamic";

export default function ResetPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Password reset</p>
        <h1 className={styles.title}>Request a reset link</h1>
        <p className={styles.subtitle}>Enter your email. If it exists, we’ll send a reset link.</p>
        <form className={styles.form} action="/api/auth/reset/request" method="post">
          <input className={styles.input} name="email" type="email" placeholder="Email" required />
          <button className={styles.primary} type="submit">
            Send reset link
          </button>
        </form>
        <p className={styles.meta}>
          Already have a token? <Link href="/reset/confirm">Enter it here</Link>
        </p>
        <p className={styles.meta}>
          Tokens expire in ~15 minutes and can be used once. If you don’t get a link, ask your admin.
        </p>
        <p className={styles.meta}>
          Back to <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
