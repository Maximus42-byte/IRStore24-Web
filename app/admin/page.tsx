import Link from "next/link";

import { mockCs2Items } from "../../data/mockCs2Items";
import { mockTf2Key } from "../../data/mockTf2Key";
import { mockOrders } from "../../data/mockOrders";

import styles from "./admin.module.css";

export default function AdminDashboardPage() {
  const availableCs2Items = mockCs2Items.filter(
    (item) => item.stockQuantity > 0,
  ).length;

  const pendingOrders = mockOrders.filter(
    (order) => order.status === "pending",
  ).length;

  const confirmedOrders = mockOrders.filter(
    (order) => order.status === "confirmed",
  ).length;

  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin Panel
        </span>

        <h1 className={styles.pageTitle}>
          Dashboard
        </h1>

        <p className={styles.pageDescription}>
          نمای کلی وضعیت فروشگاه IRStore24. این اطلاعات
          فعلاً از Mock Data خوانده می‌شوند و بعداً مستقیماً
          از FastAPI و PostgreSQL دریافت خواهند شد.
        </p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            CS2 Items
          </div>

          <div className={styles.statValue}>
            {mockCs2Items.length}
          </div>

          <div className={styles.statHint}>
            {availableCs2Items} آیتم دارای موجودی
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            TF2 Key Stock
          </div>

          <div className={styles.statValue}>
            {mockTf2Key.stockQuantity}
          </div>

          <div className={styles.statHint}>
            موجودی فعلی Mock
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Pending Orders
          </div>

          <div className={styles.statValue}>
            {pendingOrders}
          </div>

          <div className={styles.statHint}>
            منتظر تأیید پرداخت
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Confirmed Orders
          </div>

          <div className={styles.statValue}>
            {confirmedOrders}
          </div>

          <div className={styles.statHint}>
            سفارش تأییدشده در Mock Data
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            دسترسی سریع
          </h2>
        </div>

        <div className={styles.quickActions}>
          <Link
            href="/admin/cs2-items"
            className={styles.quickAction}
          >
            <span className={styles.quickActionTitle}>
              مدیریت CS2 Items
            </span>

            <span className={styles.quickActionDescription}>
              افزودن، ویرایش، موجودی و قیمت آیتم‌های CS2
            </span>
          </Link>

          <Link
            href="/admin/orders"
            className={styles.quickAction}
          >
            <span className={styles.quickActionTitle}>
              مدیریت سفارش‌ها
            </span>

            <span className={styles.quickActionDescription}>
              مشاهده Pending Orderها و تأیید یا لغو خرید
            </span>
          </Link>

          <Link
            href="/admin/settings"
            className={styles.quickAction}
          >
            <span className={styles.quickActionTitle}>
              تنظیمات فروشگاه
            </span>

            <span className={styles.quickActionDescription}>
              نرخ USDT، اطلاعات پرداخت، Telegram و زمان Reservation
            </span>
          </Link>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            وضعیت فعلی Admin
          </h2>
        </div>

        <p className={styles.pageDescription}>
          این صفحه هنوز Authentication واقعی ندارد. بعد از ساخت
          FastAPI فقط User دارای role برابر با admin اجازه ورود
          به این بخش را خواهد داشت.
        </p>
      </section>
    </>
  );
}
