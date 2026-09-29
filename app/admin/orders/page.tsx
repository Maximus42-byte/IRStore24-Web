import { mockOrders, OrderStatus } from "../../../data/mockOrders";
import Link from "next/link";
import styles from "../admin.module.css";

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "pending":
      return "در انتظار تأیید";

    case "confirmed":
      return "تأیید شده";

    case "cancelled":
      return "لغو شده";

    case "expired":
      return "منقضی شده";
  }
}

function getStatusClass(status: OrderStatus) {
  switch (status) {
    case "pending":
      return styles.orderStatusPending;

    case "confirmed":
      return styles.orderStatusConfirmed;

    case "cancelled":
      return styles.orderStatusCancelled;

    case "expired":
      return styles.orderStatusExpired;
  }
}

export default function AdminOrdersPage() {
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
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / Orders
        </span>

        <h1 className={styles.pageTitle}>
          مدیریت سفارش‌ها
        </h1>

        <p className={styles.pageDescription}>
          مشاهده سفارش‌ها، وضعیت Reservation و مدیریت
          تأیید یا لغو سفارش‌های Pending.
        </p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Total Orders
          </div>

          <div className={styles.statValue}>
            {mockOrders.length}
          </div>

          <div className={styles.statHint}>
            کل سفارش‌ها
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Pending
          </div>

          <div className={styles.statValue}>
            {pendingCount}
          </div>

          <div className={styles.statHint}>
            منتظر بررسی پرداخت
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Confirmed
          </div>

          <div className={styles.statValue}>
            {confirmedCount}
          </div>

          <div className={styles.statHint}>
            سفارش تأییدشده
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Closed
          </div>

          <div className={styles.statValue}>
            {closedCount}
          </div>

          <div className={styles.statHint}>
            لغو یا منقضی شده
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              Orders
            </h2>

            <p className={styles.tableDescription}>
              اطلاعات فعلی از Mock Data خوانده می‌شوند.
            </p>
          </div>
        </div>

        <div className={styles.adminTableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Items</th>
                <th>Created</th>
                <th>Expires</th>
                <th>Total</th>
                <th>Locked Rate</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong
                      className={styles.itemName}
                    >
                      {order.orderNumber}
                    </strong>

                    <span
                      className={styles.itemMeta}
                    >
                      ID: {order.id}
                    </span>
                  </td>

                  <td>
                    <strong
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {order.itemCount} کالا
                    </strong>

                    <span
                      className={
                        styles.tableSecondaryValue
                      }
                    >
                      {order.items.length} نوع محصول
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatDate(order.createdAt)}
                    </span>
                  </td>

                  <td>
                    <span
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatDate(order.expiresAt)}
                    </span>
                  </td>

                  <td>
                    <strong
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatToman(
                        order.totalPriceToman,
                      )}{" "}
                      تومان
                    </strong>

                    <span
                      className={styles.usdtValue}
                    >
                      {formatUsdt(
                        order.totalPriceUsdt,
                      )}{" "}
                      USDT
                    </span>
                  </td>

                  <td>
                    <strong
                      className={
                        styles.tablePrimaryValue
                      }
                    >
                      {formatToman(
                        order.lockedUsdtTomanRate,
                      )}
                    </strong>

                    <span
                      className={
                        styles.tableSecondaryValue
                      }
                    >
                      Toman / USDT
                    </span>
                  </td>

                  <td>
                    <span
                      className={`${styles.orderStatus} ${getStatusClass(
                        order.status,
                      )}`}
                    >
                      {getStatusLabel(
                        order.status,
                      )}
                    </span>
                  </td>

                  <td>
                    <div
                      className={
                        styles.orderActions
                      }
                    >
                      <Link
                        href={`/admin/orders/${order.orderNumber}`}
                        className={styles.viewOrderButton}
                        >
                        مشاهده
                        </Link>

                      {order.status ===
                        "pending" && (
                        <>
                          <button
                            type="button"
                            className={
                              styles.confirmOrderButton
                            }
                            title="اتصال واقعی به FastAPI بعداً انجام می‌شود"
                          >
                            تأیید
                          </button>

                          <button
                            type="button"
                            className={
                              styles.cancelOrderButton
                            }
                            title="اتصال واقعی به FastAPI بعداً انجام می‌شود"
                          >
                            لغو
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
