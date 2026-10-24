"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { api, errorMessage, type User } from "../../lib/api";
import styles from "../auth.module.css";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const user = await api<User>("/api/auth/login", { method: "POST", body: { email, password } });
      window.dispatchEvent(new Event("auth:changed"));
      const next = params.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : user.role === "admin" ? "/admin" : "/account");
      router.refresh();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <div className={styles.page}><div className={styles.layout}>
    <section className={styles.intro}><div className={styles.glow} /><span className={styles.brand}>IRStore24</span><h1 className={styles.introTitle}>به حساب کاربری خود وارد شوید</h1><p className={styles.introDescription}>سبد خرید و سفارش‌های خود را مدیریت کنید.</p></section>
    <section className={styles.card}><span className={styles.eyebrow}>Account</span><h2 className={styles.title}>ورود</h2><p className={styles.description}>ایمیل و رمز عبور خود را وارد کنید.</p>{params.get("registered") === "1" && <p role="status">ثبت‌نام انجام شد. اکنون وارد شوید.</p>}
      <form className={styles.form} onSubmit={submit}>
        <div className={styles.field}><label className={styles.label} htmlFor="email">Email</label><input className={styles.input} id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className={styles.field}><label className={styles.label} htmlFor="password">Password</label><input className={styles.input} id="password" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <p role="alert">{error}</p>}
        <button className={styles.submitButton} type="submit" disabled={busy}>{busy ? "در حال ورود…" : "ورود به حساب"}</button>
      </form><p className={styles.switchText}>حساب ندارید؟ <Link href="/register" className={styles.switchLink}>ثبت‌نام</Link></p>
    </section>
  </div></div>;
}
export default function LoginPage() { return <Suspense fallback={<p>در حال بارگذاری…</p>}><LoginForm /></Suspense>; }
