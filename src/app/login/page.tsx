"use client";

import styles from "./login.module.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export const dynamic = "force-dynamic";

function messageFor(error?: string | null) {
  if (!error) return null;
  if (error === "missing") return "Enter your email and password.";
  if (error === "invalid") return "That email/password is not correct.";
  if (error === "no_password") return "This account needs a password set. Ask admin to reset it.";
  if (error === "approved") return "Approved. Sign in to continue.";
  return "Could not sign you in. Try again.";
}

export default function LoginPage() {
  const params = useSearchParams();
  const error = params?.get("error");
  const msg = messageFor(error);
  const [showPw, setShowPw] = useState(false);

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
          <div className={styles.passwordRow}>
            <input
              className={styles.input}
              name="password"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
          <button className={styles.primary} type="submit">
            Sign in
          </button>
        </form>
        <p className={styles.meta}>
          <Link href="/reset">Forgot password?</Link>
        </p>
        <p className={styles.meta}>
          No account? <Link href="/signup">Request access</Link>
        </p>
      </div>
    </div>
  );
}
