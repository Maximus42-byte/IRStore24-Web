"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import UserManagementPanel from "../../../../components/admin/UserManagementPanel";
import { api, dateText, errorMessage, type AdminUser } from "../../../../lib/api";
import styles from "../../admin.module.css";
export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>(); const [user, setUser] = useState<AdminUser | null>(null); const [error, setError] = useState("");
  useEffect(() => { api<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`).then(setUser).catch(e => setError(errorMessage(e))); }, [id]);
  return <><Link href="/admin/users" className={styles.adminBackLink}>← بازگشت به کاربران</Link><header className={styles.pageHeader}><span className={styles.eyebrow}>Admin / Users / Detail</span><h1 className={styles.pageTitle}>{user?.email || "جزئیات کاربر"}</h1></header>{error && <p role="alert">{error}</p>}{user ? <><div className={styles.userDetailGrid}>{[["شناسه",user.id],["نقش",user.role],["وضعیت",user.is_active ? "فعال" : "غیرفعال"],["Ban",user.ban_status],["تاریخ عضویت",dateText(user.created_at)],["پایان محدودیت",user.banned_until ? dateText(user.banned_until) : "—"],["دلیل",user.ban_reason || "—"]].map(([label,value]) => <div className={styles.userDetailCard} key={String(label)}><div className={styles.userDetailLabel}>{label}</div><div className={styles.userDetailValue}>{value}</div></div>)}</div><UserManagementPanel user={user} onChange={setUser} /></> : !error && <p>در حال بارگذاری…</p>}</>;
}
