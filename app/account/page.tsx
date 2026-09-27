import Link from "next/link";

import { mockOrders } from "../../data/mockOrders";

import styles from "./page.module.css";

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "در انتظار تأیید";

    case "confirmed":
      return "تأیید شده";

    case "cancelled":
      return "لغو شده";

    case "expired":
      return "منقضی شده";

    default:
      return status;
  }
}

export default function AccountPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          My Account
        </span>

        <h1 className={styles.title}>
          حساب کاربری
        </h1>

        <p className={styles.description}>
          اطلاعات حساب و آخرین سفارش‌های خود را از این بخش
          مشاهده و مدیریت کنید.
        </p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.profile}>
          <div className={styles.avatar}>
            U
          </div>

          <h2 className={styles.profileTitle}>
            حساب کاربری
          </h2>

          <p className={styles.email}>
            user@example.com
          </p>

          <span className={styles.status}>
            Active
          </span>

          <div className={styles.profileActions}>
            <Link
              href="/account/orders"
              className={styles.profileLink}
            >
              همه سفارش‌ها
            </Link>

            <button
              type="button"
              className={styles.logoutButton}
            >
              خروج از حساب
            </button>
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              آخرین سفارش‌ها
            </h2>

            <Link
              href="/account/orders"
              className={styles.viewAll}
            >
              مشاهده همه
            </Link>
          </div>

          <div className={styles.orders}>
            {mockOrders.map((order) => (
              <Link
                key={order.id}
                href={`/account/orders/${order.orderNumber}`}
                className={styles.order}
              >
                <div>
                  <div className={styles.orderNumber}>
                    سفارش {order.orderNumber}
                  </div>

                  <div className={styles.orderMeta}>
                    {order.itemCount} کالا
                  </div>
                </div>

                <div className={styles.orderRight}>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[order.status]
                    }`}
                  >
                    {getStatusLabel(order.status)}
                  </span>

                  <span className={styles.orderPrice}>
                    {formatToman(
                      order.totalPriceToman,
                    )}{" "}
                    تومان
                  </span>

                  <span className={styles.orderUsdt}>
                    {formatUsdt(
                      order.totalPriceUsdt,
                    )}{" "}
                    USDT
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
