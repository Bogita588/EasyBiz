import styles from "./signup.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Record<string, string | string[] | undefined> };

export default function SignupPage({ searchParams }: Props) {
  const errorParam = searchParams?.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Request access</p>
        <h1 className={styles.title}>Get approved to use EasyBiz</h1>
        <p className={styles.subtitle}>Tell us about your business. An admin will approve you.</p>
        {error === "password_mismatch" && <p className={styles.error}>Passwords do not match.</p>}
        {error === "missing" && <p className={styles.error}>Please fill all fields.</p>}
        <form className={styles.form} action="/api/auth/signup" method="post">
          <input
            className={styles.input}
            name="name"
            placeholder="Your name"
            required
          />
          <input
            className={styles.input}
            name="email"
            type="email"
            placeholder="Work email"
            required
          />
          <input
            className={styles.input}
            name="business"
            placeholder="Business name"
            required
          />
          <input
            className={styles.input}
            name="phone"
            placeholder="Phone"
            required
          />
          <input
            className={styles.input}
            name="password"
            type="password"
            placeholder="Password"
            required
          />
          <input
            className={styles.input}
            name="confirm"
            type="password"
            placeholder="Confirm password"
            required
          />
          <button className={styles.primary} type="submit">
            Submit request
          </button>
        </form>
        <p className={styles.meta}>
          Already invited? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
