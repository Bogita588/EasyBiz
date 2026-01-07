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

type Props = {
  initialRole?: Role;
};

export function AppHeader({ initialRole }: Props) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(initialRole || "ATTENDANT");

  useEffect(() => {
    if (initialRole) return;
    if (role === "OWNER" || role === "ADMIN") return;
    const roleAttr =
      typeof document !== "undefined" ? document.body.dataset?.role : undefined;
    if (
      roleAttr === "ADMIN" ||
      roleAttr === "OWNER" ||
      roleAttr === "MANAGER" ||
      roleAttr === "ATTENDANT"
    ) {
      setRole(roleAttr);
      return;
    }
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        const r = (data?.role || "").toUpperCase();
        if (r === "ADMIN" || r === "OWNER" || r === "MANAGER" || r === "ATTENDANT") {
          setRole(r);
        }
      })
      .catch(() => {});
  }, [initialRole, role]);

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
