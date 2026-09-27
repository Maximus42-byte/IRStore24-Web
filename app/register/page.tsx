import Link from "next/link";

import styles from "../auth.module.css";

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <section className={styles.intro}>
          <div className={styles.glow} />

          <span className={styles.brand}>
            IRStore24
          </span>

          <h1 className={styles.introTitle}>
            حساب IRStore24 خود را بسازید
          </h1>

          <p className={styles.introDescription}>
            با ساخت حساب می‌توانید آیتم‌ها را به سبد خرید اضافه کنید،
            خرید خود را نهایی کنید و وضعیت سفارش‌ها را مشاهده کنید.
          </p>
        </section>

        <section className={styles.card}>
          <span className={styles.eyebrow}>
            Create Account
          </span>

          <h2 className={styles.title}>
            ثبت‌نام
          </h2>

          <p className={styles.description}>
            برای ساخت حساب کاربری، Email و Password خود را وارد کنید.
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
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Password"
                className={styles.input}
              />

              <p className={styles.passwordHint}>
                Password باید حداقل 8 کاراکتر داشته باشد.
              </p>
            </div>

            <div className={styles.field}>
              <label
                htmlFor="confirm-password"
                className={styles.label}
              >
                Confirm Password
              </label>

              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                placeholder="Repeat password"
                className={styles.input}
              />
            </div>

            <button
              type="button"
              className={styles.submitButton}
            >
              ساخت حساب کاربری
            </button>
          </form>

          <p className={styles.switchText}>
            قبلاً حساب ساخته‌اید؟{" "}
            <Link
              href="/login"
              className={styles.switchLink}
            >
              ورود
            </Link>
          </p>

          <div className={styles.securityNotice}>
            Password هیچ‌وقت به‌صورت Plain Text ذخیره نخواهد شد.
            Hash کردن Password در FastAPI انجام می‌شود.
          </div>
        </section>
      </div>
    </div>
  );
}
