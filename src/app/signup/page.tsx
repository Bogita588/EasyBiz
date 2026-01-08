"use client";

import styles from "./signup.module.css";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const params = useSearchParams();
  const errorParam = params?.get("error");
  const error = errorParam || null;
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
          <div className={styles.passwordRow}>
            <input
              className={styles.input}
              name="confirm"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm password"
              required
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? "Hide" : "Show"}
            </button>
          </div>
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
