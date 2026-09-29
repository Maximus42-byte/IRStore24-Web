import Link from "next/link";

import styles from "./admin.module.css";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={styles.adminShell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.adminBadge}>
            ADMIN
          </span>

          <h2 className={styles.sidebarTitle}>
            IRStore24
          </h2>

          <p className={styles.sidebarDescription}>
            مدیریت فروشگاه، کاربران، سفارش‌ها و تنظیمات
          </p>
        </div>

        <nav
          className={styles.nav}
          aria-label="Admin navigation"
        >
          <Link
            href="/admin"
            className={styles.navLink}
          >
            Dashboard
          </Link>

          <Link
            href="/admin/cs2-items"
            className={styles.navLink}
          >
            CS2 Items
          </Link>

          <Link
            href="/admin/tf2-keys"
            className={styles.navLink}
          >
            TF2 Keys
          </Link>

          <Link
            href="/admin/orders"
            className={styles.navLink}
          >
            Orders
          </Link>

          <Link
            href="/admin/users"
            className={styles.navLink}
          >
            Users
          </Link>

          <Link
            href="/admin/settings"
            className={styles.navLink}
          >
            Settings
          </Link>

          <div className={styles.navDivider} />

          <Link
            href="/"
            className={`${styles.navLink} ${styles.backToStore}`}
          >
            بازگشت به فروشگاه
          </Link>
        </nav>
      </aside>

      <main className={styles.content}>
        {children}
      </main>
    </div>
  );
}
