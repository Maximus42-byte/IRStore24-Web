import StoreSettingsForm from "../../../components/admin/StoreSettingsForm";
import { mockStoreSettings } from "../../../data/mockStoreSettings";

import styles from "../admin.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AdminSettingsPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / Settings
        </span>

        <h1 className={styles.pageTitle}>
          تنظیمات فروشگاه
        </h1>

        <p className={styles.pageDescription}>
          مدیریت نرخ USDT، اطلاعات پرداخت، لینک‌های ارتباطی
          و مدت Reservation سفارش‌ها.
        </p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            USDT Rate
          </div>

          <div className={styles.statValue}>
            {new Intl.NumberFormat("en-US").format(
              mockStoreSettings.usdtTomanRate,
            )}
          </div>

          <div className={styles.statHint}>
            تومان برای 1 USDT
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Reservation
          </div>

          <div className={styles.statValue}>
            {mockStoreSettings.orderReservationMinutes}
          </div>

          <div className={styles.statHint}>
            دقیقه
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Payment Card
          </div>

          <div className={styles.statValue}>
            {mockStoreSettings.cardNumber
              ? "Configured"
              : "Not Set"}
          </div>

          <div className={styles.statHint}>
            اطلاعات پرداخت
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Last Update
          </div>

          <div className={styles.statValue}>
            Admin
          </div>

          <div className={styles.statHint}>
            {formatDate(
              mockStoreSettings.updatedAt,
            )}
          </div>
        </div>
      </section>

      <StoreSettingsForm
        initialValues={mockStoreSettings}
      />
    </>
  );
}
