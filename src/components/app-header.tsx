"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./app-header.module.css";

type Role = "ADMIN" | "OWNER" | "MANAGER" | "ATTENDANT";

const links: Array<{ href: string; label: string; roles?: Role[] }> = [
  { href: "/home", label: "Home" },
  { href: "/invoice/new", label: "Sell" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers", roles: ["OWNER", "MANAGER"] },
  { href: "/inventory", label: "Inventory", roles: ["OWNER", "MANAGER"] },
  { href: "/users", label: "Users", roles: ["OWNER", "ADMIN"] },
  { href: "/api/auth/logout", label: "Logout" },
];

export function AppHeader() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("ATTENDANT");

  useEffect(() => {
    const cookie = document.cookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("ez_session="));
    if (!cookie) return;
    const val = cookie.split("=")[1];
    try {
      const parsed = JSON.parse(atob(val));
      const raw = (parsed?.role || "").toUpperCase();
      if (raw === "ADMIN" || raw === "OWNER" || raw === "MANAGER" || raw === "ATTENDANT") {
        setRole(raw);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  return (
    <>
      <header className={styles.bar}>
        <div className={styles.brand}>
          <span className={styles.logo}>EZ</span>
          <span className={styles.name}>EasyBiz</span>
        </div>
        <button
          className={styles.menuButton}
          onClick={toggle}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <span className={`${styles.line} ${open ? styles.lineOpenTop : ""}`} />
          <span className={`${styles.line} ${open ? styles.lineOpenMid : ""}`} />
          <span className={`${styles.line} ${open ? styles.lineOpenBot : ""}`} />
        </button>
      </header>

      <div className={`${styles.drawer} ${open ? styles.open : ""}`}>
        <div className={styles.drawerHeader}>
          <div className={styles.brand}>
            <span className={styles.logo}>EZ</span>
            <span className={styles.name}>EasyBiz</span>
          </div>
          <button className={styles.closeButton} onClick={close} aria-label="Close menu">
            ×
          </button>
        </div>
        <nav className={styles.navList}>
          {links
            .filter((link) => !link.roles || link.roles.includes(role))
            .map((link) => (
              <Link key={link.href} href={link.href} className={styles.navLink} onClick={close}>
                {link.label}
              </Link>
            ))}
        </nav>
      </div>
      {open && <div className={styles.backdrop} onClick={close} />}
    </>
  );
}
