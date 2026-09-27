import styles from "./page.module.css";

export default function SupportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          IRStore24 Support
        </span>

        <h1 className={styles.title}>
          پشتیبانی
        </h1>

        <p className={styles.description}>
          برای هماهنگی خرید، فروش یا دریافت پشتیبانی می‌توانید
          از طریق Telegram یا Instagram با IRStore24 در ارتباط باشید.
        </p>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.icon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className={styles.socialIcon}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21.7 3.4L2.9 10.7C1.6 11.2 1.6 11.9 2.7 12.3L7.5 13.8L18.7 6.7C19.2 6.4 19.7 6.6 19.3 7L10.2 15.2L9.9 20C10.4 20 10.6 19.8 10.9 19.5L13.2 17.3L18 20.8C18.9 21.3 19.5 21 19.7 20L22.9 4.9C23.2 3.6 22.4 3 21.7 3.4Z"
                fill="currentColor"
              />
            </svg>
          </div>

          <h2 className={styles.cardTitle}>
            Telegram
          </h2>

          <p className={styles.cardDescription}>
            برای نهایی‌کردن خرید، هماهنگی پرداخت، فروش آیتم و
            پشتیبانی مستقیم از Telegram استفاده کنید.
          </p>

          <a
            href="https://t.me/IRStoore"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.action}
          >
            باز کردن Telegram
          </a>
        </article>

        <article className={styles.card}>
          <div className={styles.icon} aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className={styles.socialIcon}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="12"
                cy="12"
                r="4"
                stroke="currentColor"
                strokeWidth="2"
              />

              <circle
                cx="17.3"
                cy="6.7"
                r="1.2"
                fill="currentColor"
              />
            </svg>
          </div>

          <h2 className={styles.cardTitle}>
            Instagram
          </h2>

          <p className={styles.cardDescription}>
            صفحه Instagram IRStore24 برای ارتباط و دنبال‌کردن
            فعالیت‌های فروشگاه در دسترس است.
          </p>

          <a
            href="https://www.instagram.com/irstore_community?igsh=MTZjYzk2bWFqNTdsbg%3D%3D&utm_source=qr"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.action}
          >
            باز کردن Instagram
          </a>
        </article>
      </div>

      <div className={styles.notice}>
        در MVP فعلی، هماهنگی پرداخت و تأیید نهایی خرید از طریق
        Telegram انجام می‌شود. سیستم Payment Gateway خودکار در این
        نسخه وجود ندارد.
      </div>
    </div>
  );
}
