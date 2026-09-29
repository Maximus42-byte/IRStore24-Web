import Link from "next/link";
import { notFound } from "next/navigation";

import { getMockOrderByNumber } from "../../../../data/mockOrders";
import OrderCountdown from "../../../../components/store/OrderCountdown";
import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    order_number: string;
  }>;
};

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
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

export default async function OrderDetailPage({
  params,
}: PageProps) {
  const { order_number } = await params;

  const order = getMockOrderByNumber(order_number);

  if (!order) {
    notFound();
  }

  const isPending = order.status === "pending";

  return (
    <div className={styles.page}>
      <Link
        href="/account/orders"
        className={styles.backLink}
      >
        ← بازگشت به سفارش‌ها
      </Link>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.header}>
            <div className={styles.headerTop}>
              <h1 className={styles.orderNumber}>
                سفارش {order.orderNumber}
              </h1>

              <span
                className={`${styles.status} ${
                  styles[order.status]
                }`}
              >
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className={styles.meta}>
              <span>
                تاریخ ایجاد: {formatDate(order.createdAt)}
              </span>

              <span>
                تعداد کالا: {order.itemCount}
              </span>

              {order.expiresAt && (
                <span>
                  پایان Reservation:{" "}
                  {formatDate(order.expiresAt)}
                </span>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              آیتم‌های سفارش
            </h2>

            <div className={styles.items}>
              {order.items.map((item) => (
                <article
                  key={item.id}
                  className={styles.item}
                >
                  <div className={styles.itemVisual}>
                    {item.type === "cs2"
                      ? "CS2"
                      : "KEY"}
                  </div>

                  <div>
                    <div className={styles.itemName}>
                      {item.name}
                    </div>

                    <div
                      className={styles.itemDescription}
                    >
                      {item.description}
                    </div>

                    <div
                      className={styles.itemQuantity}
                    >
                      تعداد: {item.quantity}
                    </div>
                  </div>

                  <div className={styles.itemPrice}>
                    <span className={styles.itemToman}>
                      {formatToman(
                        item.unitPriceToman *
                          item.quantity,
                      )}{" "}
                      تومان
                    </span>

                    <span className={styles.itemUsdt}>
                      {formatUsdt(
                        item.unitPriceUsdt *
                          item.quantity,
                      )}{" "}
                      USDT
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {isPending && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                تکمیل خرید
              </h2>
            
            {order.expiresAt && (
                <OrderCountdown
                    expiresAt={order.expiresAt}
                />
            )}
            
              <div className={styles.paymentNotice}>
                اطلاعات شماره کارت در نسخه نهایی از تنظیمات
                فروشگاه در FastAPI دریافت خواهد شد. پس از
                واریز، برای تأیید پرداخت از طریق Telegram با
                IRStore24 در ارتباط باشید.
              </div>

              <a
                href="https://t.me/IRStoore"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.telegramButton}
              >
                ادامه در Telegram
              </a>

              <button
                type="button"
                className={styles.cancelButton}
              >
                لغو سفارش
              </button>
            </section>
          )}
        </main>

        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>
            خلاصه سفارش
          </h2>

          <div className={styles.summaryRow}>
            <span>شماره سفارش</span>

            <strong>
              {order.orderNumber}
            </strong>
          </div>

          <div className={styles.summaryRow}>
            <span>وضعیت</span>

            <strong>
              {getStatusLabel(order.status)}
            </strong>
          </div>

          <div className={styles.summaryRow}>
            <span>تعداد کالا</span>

            <strong>
              {order.itemCount}
            </strong>
          </div>

          <div className={styles.divider} />

          <div className={styles.totalLabel}>
            مبلغ نهایی
          </div>

          <div className={styles.totalToman}>
            {formatToman(
              order.totalPriceToman,
            )}{" "}
            تومان
          </div>

          <div className={styles.totalUsdt}>
            {formatUsdt(
              order.totalPriceUsdt,
            )}{" "}
            USDT
          </div>

          <div className={styles.rate}>
            نرخ قفل‌شده سفارش:
            <br />
            1 USDT ={" "}
            {formatToman(
              order.lockedUsdtTomanRate,
            )}{" "}
            تومان
          </div>
        </aside>
      </div>
    </div>
  );
}
