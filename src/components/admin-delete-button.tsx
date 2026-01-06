"use client";

import { useRouter } from "next/navigation";
import styles from "@/app/admin/admin.module.css";

type Props = { tenantId: string };

export function AdminDeleteButton({ tenantId }: Props) {
  const router = useRouter();

  const handleDelete = async () => {
    const ok = window.confirm("Delete this tenant and all data? This cannot be undone.");
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      alert("Could not delete tenant.");
    }
  };

  return (
    <button className={styles.danger} type="button" onClick={handleDelete}>
      Delete tenant
    </button>
  );
}
