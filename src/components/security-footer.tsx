import { cookies } from "next/headers";
import styles from "./security-footer.module.css";

export default async function SecurityFooter() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("ez_session")?.value;
  let tenantId = "Unknown";
  let role = "Unknown";
  if (raw) {
    try {
      const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (parsed.tenantId) tenantId = parsed.tenantId;
      if (parsed.role) role = parsed.role;
    } catch {
      // ignore
    }
  }

  return (
    <footer className={styles.footer}>
      <div>
        <p className={styles.label}>Session</p>
        <p className={styles.meta}>
          Tenant: {tenantId} • Role: {role}
        </p>
      </div>
      <div>
        <p className={styles.label}>Security</p>
        <p className={styles.meta}>Tenant isolation active • Security headers enforced</p>
      </div>
    </footer>
  );
}
