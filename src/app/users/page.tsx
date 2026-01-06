import styles from "./users.module.css";
import { prisma } from "@/lib/prisma";
import { getTenantId } from "@/lib/data";
import { AddUserForm } from "@/components/add-user-form";
import { UserSeatRequester } from "@/components/user-seat-requester";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const tenantId = await getTenantId();
  const users = await prisma.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  let seatsEnabled = false;
  let seatsRequested = false;
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { userSeatsEnabled: true, userSeatsRequested: true },
    });
    seatsEnabled = Boolean((tenant as { userSeatsEnabled?: boolean | null } | null)?.userSeatsEnabled);
    seatsRequested = Boolean((tenant as { userSeatsRequested?: boolean | null } | null)?.userSeatsRequested);
  } catch {
    // Older schema without column: treat as disabled to keep safe.
    seatsEnabled = false;
    seatsRequested = false;
  }

  const canAdd = seatsEnabled; // middleware already restricts to owner/admin

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Users</p>
          <h1 className={styles.title}>People with access</h1>
          <p className={styles.subtitle}>
            Extra users are a paid add-on. Admin must enable seats; owners can assign roles after enablement.
          </p>
          <ul className={styles.roleList}>
            <li><strong>Owner</strong>: full access to all areas and settings.</li>
            <li><strong>Manager</strong>: manage inventory, suppliers, purchase orders, and money pages.</li>
            <li><strong>Attendant</strong>: sell and invoice; no access to money, inventory, suppliers, or user management.</li>
          </ul>
        </div>
      </header>

      {canAdd ? (
        <div className={styles.card}>
          <AddUserForm />
        </div>
      ) : (
        <div className={`${styles.card} ${styles.lockedCard}`}>
          <div>
            <p className={styles.lockedTitle}>User seats are locked</p>
            <p className={styles.meta}>
              Ask the platform admin to enable extra users for your tenant. Once approved, you can add teammates here.
            </p>
          </div>
          <UserSeatRequester initialEnabled={seatsEnabled} initialRequested={seatsRequested} />
        </div>
      )}

      <div className={styles.list}>
        {users.map((user) => (
          <div key={user.id} className={styles.row}>
            <div>
              <p className={styles.name}>{user.name || "User"}</p>
              <p className={styles.meta}>{user.email}</p>
            </div>
            <div className={styles.roleBlock}>
              <span className={styles.pill}>{user.role}</span>
              <p className={styles.meta}>Joined {user.createdAt.toISOString().slice(0, 10)}</p>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className={styles.meta}>No users yet.</p>}
      </div>
    </div>
  );
}
