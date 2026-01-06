import styles from "./login.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Welcome</p>
        <h1 className={styles.title}>Sign in to EasyBiz</h1>
        <p className={styles.subtitle}>Admins go to console. Owners/staff go to the ERP.</p>
        <form className={styles.form} action="/api/auth/login" method="post">
          <input
            className={styles.input}
            name="email"
            type="email"
            placeholder="Email"
            required
          />
          <input
            className={styles.input}
            name="password"
            type="password"
            placeholder="Password"
            required
          />
          <button className={styles.primary} type="submit">
            Sign in
          </button>
        </form>
        <p className={styles.meta}>
          No account? <Link href="/signup">Request access</Link>
        </p>
      </div>
    </div>
  );
}
