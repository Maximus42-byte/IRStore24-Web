"use client";
import { useEffect, useState } from "react";
import { api, errorMessage, type PublicSettings } from "../../lib/api";
import { INSTAGRAM_URL, TELEGRAM_URL, safeExternalUrl } from "../../lib/social";
import styles from "./page.module.css";
export default function SupportPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null); const [error, setError] = useState("");
  useEffect(() => { api<PublicSettings>("/api/store/settings/public").then(setSettings).catch(e => setError(errorMessage(e))); }, []);
  return <div className={styles.page}><header className={styles.header}><span className={styles.eyebrow}>IRStore24 Support</span><h1 className={styles.title}>پشتیبانی</h1><p className={styles.description}>برای هماهنگی خرید، فروش یا دریافت پشتیبانی از راه‌های ارتباطی فروشگاه استفاده کنید.</p></header>{error && <p role="alert">{error}</p>}<div className={styles.grid}>
    <article className={styles.card}><h2 className={styles.cardTitle}>Telegram</h2><p className={styles.cardDescription}>ارتباط مستقیم برای هماهنگی سفارش</p><a href={safeExternalUrl(settings?.telegram_url) || TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.action}>باز کردن Telegram</a></article>
    <article className={styles.card}><h2 className={styles.cardTitle}>Instagram</h2><p className={styles.cardDescription}>صفحه فروشگاه</p><a href={safeExternalUrl(settings?.instagram_url) || INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.action}>باز کردن Instagram</a></article></div><div className={styles.notice}>پرداخت و تأیید سفارش در این نسخه به صورت دستی هماهنگ می‌شود.</div></div>;
}
