"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage, type AdminCS2Item, type AdminOrder, type AdminTF2Key, type AdminUser, type Page } from "../../lib/api";
import styles from "./admin.module.css";
export default function AdminPage() {
  const [counts, setCounts] = useState({cs2:0, tf2:0, orders:0, users:0}); const [error, setError] = useState("");
  useEffect(() => { Promise.all([api<Page<AdminCS2Item>>("/api/admin/cs2-items?page_size=1"),api<Page<AdminTF2Key>>("/api/admin/tf2-keys?page_size=1"),api<Page<AdminOrder>>("/api/admin/orders?status=pending&page_size=1"),api<Page<AdminUser>>("/api/admin/users?page_size=1")]).then(([cs2,tf2,orders,users]) => setCounts({cs2:cs2.total,tf2:tf2.total,orders:orders.total,users:users.total})).catch(e => setError(errorMessage(e))); }, []);
  return <><header className={styles.pageHeader}><span className={styles.eyebrow}>Admin Dashboard</span><h1 className={styles.pageTitle}>مدیریت فروشگاه</h1><p className={styles.pageDescription}>آمار فعلی از FastAPI</p></header>{error && <p role="alert">{error}</p>}<div className={styles.statsGrid}>{[["آیتم‌های CS2",counts.cs2,"/admin/cs2-items"],["کلیدهای TF2",counts.tf2,"/admin/tf2-keys"],["سفارش‌های در انتظار",counts.orders,"/admin/orders"],["کاربران",counts.users,"/admin/users"]].map(([label,value,href]) => <Link href={String(href)} className={styles.statCard} key={String(label)}><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value}</strong></Link>)}</div><section className={styles.section}><h2 className={styles.sectionTitle}>دسترسی سریع</h2><div className={styles.quickActions}><Link href="/admin/cs2-items/new" className={styles.quickAction}>افزودن آیتم CS2</Link><Link href="/admin/settings" className={styles.quickAction}>تنظیمات فروشگاه</Link><Link href="/admin/orders" className={styles.quickAction}>سفارش‌ها</Link></div></section></>;
}
