import Link from "next/link";

import styles from "../auth.module.css";

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.intro}>
          <div className={styles.glow} />

          <span className={styles.brand}>
            IRStore24
          </span>

          <h1 className={styles.introTitle}>
            به حساب کاربری خود وارد شوید
          </h1>

          <p className={styles.introDescription}>
            بعد از ورود می‌توانید سبد خرید، سفارش‌های فعال و
            تاریخچه خریدهای خود را مدیریت کنید.
          </p>
        </section>

        <section className={styles.card}>
          <span className={styles.eyebrow}>
            Account
          </span>

          <h2 className={styles.title}>
            ورود
          </h2>

          <p className={styles.description}>
            برای ورود، Email و Password حساب خود را وارد کنید.
          </p>

          <form className={styles.form}>
            <div className={styles.field}>
              <label
                htmlFor="email"
                className={styles.label}
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@example.com"
                className={styles.input}
              />
            </div>

            <div className={styles.field}>
              <label
                htmlFor="password"
                className={styles.label}
              >
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password"
                className={styles.input}
              />
            </div>

            <button
              type="button"
              className={styles.submitButton}
            >
              ورود به حساب
            </button>
          </form>

          <p className={styles.switchText}>
            حساب کاربری ندارید؟{" "}
            <Link
              href="/register"
              className={styles.switchLink}
            >
              ثبت‌نام
            </Link>
          </p>

          <div className={styles.securityNotice}>
            Authentication واقعی در مرحله Backend به FastAPI متصل
            می‌شود. Session نهایی با Secure HttpOnly Cookie مدیریت
            خواهد شد.
          </div>
        </section>
      </div>
    </div>
  );
}
