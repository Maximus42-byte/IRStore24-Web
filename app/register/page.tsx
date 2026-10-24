"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, type User } from "../../lib/api";
import styles from "../auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirm) { setError("رمز عبور و تکرار آن یکسان نیستند."); return; }
    setBusy(true); setError("");
    try { await api<User>("/api/auth/register", { method: "POST", body: { email, password } }); router.push("/login?registered=1"); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className={styles.page}><div className={styles.layout}>
    <section className={styles.intro}><div className={styles.glow} /><span className={styles.brand}>IRStore24</span><h1 className={styles.introTitle}>حساب IRStore24 خود را بسازید</h1><p className={styles.introDescription}>پس از ثبت‌نام برای ورود و خرید آماده خواهید بود.</p></section>
    <section className={styles.card}><span className={styles.eyebrow}>Create Account</span><h2 className={styles.title}>ثبت‌نام</h2>
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}><label className={styles.label} htmlFor="email">Email</label><input className={styles.input} id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.label} htmlFor="password">Password</label><input className={styles.input} id="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e => setPassword(e.target.value)} /><p className={styles.passwordHint}>حداقل ۱۲ کاراکتر</p></div>
        <div className={styles.field}><label className={styles.label} htmlFor="confirm">Confirm Password</label><input className={styles.input} id="confirm" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></div>
        {error && <p role="alert">{error}</p>}
        <button className={styles.submitButton} type="submit" disabled={busy}>{busy ? "در حال ثبت‌نام…" : "ساخت حساب کاربری"}</button>
      </form><p className={styles.switchText}>قبلاً حساب ساخته‌اید؟ <Link href="/login" className={styles.switchLink}>ورود</Link></p>
    </section>
  </div></div>;
}
