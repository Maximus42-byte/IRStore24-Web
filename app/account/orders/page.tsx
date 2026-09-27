import Link from "next/link";

import { mockOrders } from "../../../data/mockOrders";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function OrdersPage() {
  const pendingCount = mockOrders.filter(
    (order) => order.status === "pending",
  ).length;

  const confirmedCount = mockOrders.filter(
    (order) => order.status === "confirmed",
  ).length;

  const closedCount = mockOrders.filter(
    (order) =>
      order.status === "cancelled" ||
      order.status === "expired",
  ).length;

  return (
    <div className={styles.page}>
      <Link href="/account" className={styles.backLink}>
        ← بازگشت به حساب کاربری
      </Link>

      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Order History
        </span>

        <h1 className={styles.title}>
          سفارش‌های من
        </h1>

        <p className={styles.description}>
          وضعیت سفارش‌های فعال و قبلی خود را مشاهده کنید.
          سفارش‌های Pending تا پایان زمان Reservation منتظر تأیید
          پرداخت خواهند بود.
        </p>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            کل سفارش‌ها
          </div>

          <div className={styles.summaryValue}>
            {mockOrders.length}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            در انتظار تأیید
          </div>

          <div className={styles.summaryValue}>
            {pendingCount}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            تأیید شده
          </div>

          <div className={styles.summaryValue}>
            {confirmedCount}
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>
            لغو / منقضی
          </div>

          <div className={styles.summaryValue}>
            {closedCount}
          </div>
        </div>
      </div>

      {mockOrders.length > 0 ? (
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
                  <span>
                    {order.itemCount} کالا
                  </span>

                  <span>
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>

              <div className={styles.right}>
                <span
                  className={`${styles.status} ${
                    styles[order.status]
                  }`}
                >
                  {getStatusLabel(order.status)}
                </span>

                <span className={styles.price}>
                  {formatToman(order.totalPriceToman)} تومان
                </span>

                <span className={styles.usdt}>
                  {formatUsdt(order.totalPriceUsdt)} USDT
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          هنوز سفارشی ثبت نشده است.
        </div>
      )}
    </div>
  );
}
