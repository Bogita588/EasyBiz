import styles from "./login.module.css";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function messageFor(error?: string | null) {
  if (!error) return null;
  if (error === "missing") return "Enter your email and password.";
  if (error === "invalid") return "That email/password is not correct.";
  if (error === "no_password") return "This account needs a password set. Ask admin to reset it.";
  if (error === "approved") return "Approved. Sign in to continue.";
  return "Could not sign you in. Try again.";
}

export default async function LoginPage({ searchParams }: Props) {
  const resolved = searchParams ? await searchParams : undefined;
  const errorParam = resolved?.error;
  const error = Array.isArray(errorParam) ? errorParam[0] : errorParam;
  const msg = messageFor(error);

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Welcome</p>
        <h1 className={styles.title}>Sign in to EasyBiz</h1>
        <p className={styles.subtitle}>Admins go to console. Owners/staff go to the ERP.</p>
        {msg && <p className={styles.error}>{msg}</p>}
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
