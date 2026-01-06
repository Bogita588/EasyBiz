"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "@/app/users/users.module.css";

const roles: Array<"ATTENDANT" | "MANAGER" | "OWNER"> = ["ATTENDANT", "MANAGER", "OWNER"];

export function AddUserForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ATTENDANT" | "MANAGER" | "OWNER">("ATTENDANT");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 2400);
    return () => clearTimeout(t);
  }, [message]);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed");
      }
      setMessage("User added. This is a paid add-on.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("ATTENDANT");
      router.refresh();
    } catch {
      setMessage("Could not add user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <p className={styles.label}>Add user (add-on)</p>
      <div className={styles.formGrid}>
        <input
          className={styles.input}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={styles.input}
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className={styles.input}
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className={styles.primary}
          type="button"
          onClick={submit}
          disabled={busy || !email || !password || !name}
        >
          Invite user
        </button>
      </div>
      {message && <p className={styles.meta}>{message}</p>}
    </div>
  );
}
