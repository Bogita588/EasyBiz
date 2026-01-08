"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "@/app/users/users.module.css";
import { getCsrfToken } from "@/lib/csrf";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: "OWNER" | "MANAGER" | "ATTENDANT" | "ADMIN";
  createdAt: string;
};

type Props = {
  users: User[];
};

export function UserListClient({ users }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const save = async (
    id: string,
    payload: { name?: string; email?: string; role?: string; password?: string },
  ) => {
    setBusy(id);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed");
      }
      setMessage("User updated.");
      router.refresh();
    } catch (e) {
      setMessage("Could not update user.");
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this user?")) return;
    setBusy(id);
    setMessage(null);
    try {
      const csrf = getCsrfToken();
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: csrf ? { "x-csrf-token": csrf } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed");
      }
      setMessage("User deleted.");
      router.refresh();
    } catch (e) {
      setMessage("Could not delete user.");
      console.error(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={styles.list}>
      <p className={styles.meta}>
        Passwords are not retrievable. To change access, set a new password in-line, then save.
      </p>
      {users.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          onSave={save}
          onDelete={remove}
          busy={busy === user.id}
        />
      ))}
      {message && <p className={styles.meta}>{message}</p>}
      {users.length === 0 && <p className={styles.meta}>No users yet.</p>}
    </div>
  );
}

type RowProps = {
  user: User;
  busy: boolean;
  onSave: (
    id: string,
    payload: { name?: string; email?: string; role?: string; password?: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

function UserRow({ user, busy, onSave, onDelete }: RowProps) {
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [role, setRole] = useState<"OWNER" | "MANAGER" | "ATTENDANT" | "ADMIN">(user.role);
  const [password, setPassword] = useState("");

  const handleSave = () => {
    const payload: { name?: string; email?: string; role?: string; password?: string } = {
      name,
      email,
      role,
    };
    if (password) payload.password = password;
    onSave(user.id, payload).then(() => setPassword(""));
  };

  return (
    <div className={styles.row}>
      <div>
        <p className={styles.name}>{name || "User"}</p>
        <input
          className={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
        />
        <input
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
        />
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (leave blank to keep)"
        />
        <p className={styles.meta}>Joined {user.createdAt.slice(0, 10)}</p>
      </div>
      <div className={styles.roleBlock}>
        <select
          className={styles.input}
          value={role}
          onChange={(e) =>
            setRole(e.target.value as "OWNER" | "MANAGER" | "ATTENDANT" | "ADMIN")
          }
        >
          <option value="OWNER">OWNER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="ATTENDANT">ATTENDANT</option>
        </select>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primary}
            onClick={handleSave}
            disabled={busy}
          >
            Save
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => onDelete(user.id)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
