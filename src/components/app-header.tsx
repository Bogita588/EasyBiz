"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./app-header.module.css";

type Role = "ADMIN" | "OWNER" | "MANAGER" | "ATTENDANT";

const links: Array<{ href: string; label: string; roles?: Role[] }> = [
  { href: "/home", label: "Home" },
  { href: "/invoice/new", label: "Sell" },
  { href: "/invoices", label: "Invoices" },
  { href: "/customers", label: "Customers" },
  { href: "/suppliers", label: "Suppliers", roles: ["OWNER", "MANAGER"] },
  { href: "/inventory", label: "Inventory", roles: ["OWNER", "MANAGER"] },
  { href: "/collections", label: "Collections", roles: ["OWNER", "MANAGER"] },
  { href: "/sales/quick", label: "Quick sale", roles: ["OWNER", "MANAGER"] },
  { href: "/sales/log", label: "Sales log", roles: ["OWNER", "MANAGER"] },
  { href: "/users", label: "Users", roles: ["OWNER", "ADMIN"] },
  { href: "/api/auth/logout", label: "Logout" },
];

type Props = {
  initialRole?: Role;
};

export function AppHeader({ initialRole }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const hideHeader = useMemo(
    () =>
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/register") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/reset") ||
      pathname?.startsWith("/access"),
    [pathname],
  );
  const [role, setRole] = useState<Role>(() => {
    if (initialRole) return initialRole;
    if (typeof document !== "undefined") {
      const roleAttr = document.body.dataset?.role;
      if (
        roleAttr === "ADMIN" ||
        roleAttr === "OWNER" ||
        roleAttr === "MANAGER" ||
        roleAttr === "ATTENDANT"
      ) {
        return roleAttr;
      }
    }
    return "ATTENDANT";
  });

  useEffect(() => {
    fetch("/api/me")
      .then((res) => res.json())
      .then((data) => {
        const r = (data?.role || "").toUpperCase();
        if (r === "ADMIN" || r === "OWNER" || r === "MANAGER" || r === "ATTENDANT") {
          setRole(r);
        }
        const status = (data?.status || "").toUpperCase();
        if (status === "PENDING" || status === "SUSPENDED") {
          setOpen(false);
        }
      })
      .catch(() => {});
  }, [initialRole]);

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  if (hideHeader) {
    return null;
  }

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

      <div className={`${styles.drawer} ${open ? styles.open : styles.drawerClosed}`}>
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
      <div
        className={`${styles.backdrop} ${open ? styles.backdropOpen : ""}`}
        onClick={close}
        aria-hidden="true"
      />
    </>
  );
}
