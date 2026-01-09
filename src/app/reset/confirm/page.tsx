import styles from "./reset-confirm.module.css";

export const dynamic = "force-dynamic";

export default function ResetConfirmPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <p className={styles.kicker}>Password reset</p>
        <h1 className={styles.title}>Use the reset link from your email</h1>
        <p className={styles.subtitle}>
          Enter the token from your email/WhatsApp link and set a new password.
        </p>
        <form className={styles.form} action="/api/auth/reset/confirm" method="post">
          <input className={styles.input} name="token" placeholder="Reset token" required />
          <input
            className={styles.input}
            name="password"
            type="password"
            placeholder="New password"
            required
          />
          <button className={styles.primary} type="submit">Reset password</button>
        </form>
        <p className={styles.meta}>Tokens expire in ~15 minutes and can only be used once.</p>
      </div>
    </div>
  );
}
