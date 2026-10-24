"use client";
import { useEffect, useState } from "react";
import StoreSettingsForm from "../../../components/admin/StoreSettingsForm";
import { api, ApiError, dateText, errorMessage, money, type AdminSettings } from "../../../lib/api";
import styles from "../admin.module.css";
export default function SettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { api<AdminSettings>("/api/admin/settings").then(setSettings).catch(e => { if (!(e instanceof ApiError && e.status === 404)) setError(errorMessage(e)); }).finally(() => setLoading(false)); }, []);
  return <><header className={styles.pageHeader}><span className={styles.eyebrow}>Admin / Settings</span><h1 className={styles.pageTitle}>تنظیمات فروشگاه</h1><p className={styles.pageDescription}>{settings ? `آخرین بروزرسانی: ${dateText(settings.updated_at)} · نرخ: ${money(settings.usdt_toman_rate)} تومان` : "تنظیمات هنوز ایجاد نشده‌اند. نرخ واقعی را برای شروع وارد کنید."}</p></header>{loading ? <p>در حال بارگذاری…</p> : error ? <p role="alert">{error}</p> : <StoreSettingsForm initialValues={settings} onSaved={setSettings} />}</>;
}
