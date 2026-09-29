"use client";

import { FormEvent, useState } from "react";

import type { MockStoreSettings } from "../../data/mockStoreSettings";

import styles from "../../app/admin/admin.module.css";

type StoreSettingsFormProps = {
  initialValues: MockStoreSettings;
};

export default function StoreSettingsForm({
  initialValues,
}: StoreSettingsFormProps) {
  const [usdtTomanRate, setUsdtTomanRate] =
    useState(String(initialValues.usdtTomanRate));

  const [cardNumber, setCardNumber] =
    useState(initialValues.cardNumber);

  const [cardHolderName, setCardHolderName] =
    useState(initialValues.cardHolderName);

  const [telegramUsername, setTelegramUsername] =
    useState(initialValues.telegramUsername);

  const [telegramUrl, setTelegramUrl] =
    useState(initialValues.telegramUrl);

  const [instagramUrl, setInstagramUrl] =
    useState(initialValues.instagramUrl);

  const [
    orderReservationMinutes,
    setOrderReservationMinutes,
  ] = useState(
    String(initialValues.orderReservationMinutes),
  );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /*
     * UI only for now.
     * FastAPI will persist these settings later.
     */
  }

  return (
    <form
      className={styles.adminForm}
      onSubmit={handleSubmit}
    >
      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            نرخ ارز
          </h2>

          <p className={styles.formSectionDescription}>
            نرخ مرکزی تبدیل USDT به تومان در فروشگاه.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="usdtTomanRate">
              1 USDT = ? TOMAN
            </label>

            <input
              id="usdtTomanRate"
              type="number"
              min="1"
              step="1"
              required
              dir="ltr"
              value={usdtTomanRate}
              onChange={(event) =>
                setUsdtTomanRate(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            اطلاعات پرداخت
          </h2>

          <p className={styles.formSectionDescription}>
            این اطلاعات بعداً برای سفارش Pending به مشتری
            نمایش داده می‌شوند.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="cardNumber">
              Card Number
            </label>

            <input
              id="cardNumber"
              type="text"
              dir="ltr"
              placeholder="شماره کارت هنوز تنظیم نشده"
              value={cardNumber}
              onChange={(event) =>
                setCardNumber(event.target.value)
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="cardHolderName">
              Card Holder Name
            </label>

            <input
              id="cardHolderName"
              type="text"
              placeholder="نام صاحب کارت"
              value={cardHolderName}
              onChange={(event) =>
                setCardHolderName(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            شبکه‌های اجتماعی
          </h2>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="telegramUsername">
              Telegram Username
            </label>

            <input
              id="telegramUsername"
              type="text"
              dir="ltr"
              required
              value={telegramUsername}
              onChange={(event) =>
                setTelegramUsername(
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="telegramUrl">
              Telegram URL
            </label>

            <input
              id="telegramUrl"
              type="url"
              dir="ltr"
              required
              value={telegramUrl}
              onChange={(event) =>
                setTelegramUrl(
                  event.target.value,
                )
              }
            />
          </div>

          <div
            className={`${styles.formField} ${styles.formFieldFull}`}
          >
            <label htmlFor="instagramUrl">
              Instagram URL
            </label>

            <input
              id="instagramUrl"
              type="url"
              dir="ltr"
              required
              value={instagramUrl}
              onChange={(event) =>
                setInstagramUrl(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            Reservation سفارش
          </h2>

          <p className={styles.formSectionDescription}>
            این مقدار فقط روی سفارش‌های جدید اعمال خواهد شد.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="reservationMinutes">
              Reservation Minutes
            </label>

            <input
              id="reservationMinutes"
              type="number"
              min="1"
              step="1"
              required
              dir="ltr"
              value={orderReservationMinutes}
              onChange={(event) =>
                setOrderReservationMinutes(
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <div className={styles.formActions}>
        <button
          type="submit"
          className={styles.primaryAdminButton}
        >
          ذخیره تنظیمات
        </button>
      </div>

      <p className={styles.formNotice}>
        ذخیره واقعی تنظیمات بعداً توسط FastAPI و PostgreSQL
        انجام خواهد شد.
      </p>
    </form>
  );
}
