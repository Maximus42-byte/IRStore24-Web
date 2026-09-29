"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import styles from "../../app/admin/admin.module.css";

type TF2KeyFormValues = {
  name: string;
  description: string;
  stockQuantity: string;
  sellPriceToman: string;
  sellPriceUsdt: string;
  buyPriceToman: string;
  buyPriceUsdt: string;
  isActive: boolean;
};

type TF2KeyFormProps = {
  initialValues: TF2KeyFormValues;
};

export default function TF2KeyForm({
  initialValues,
}: TF2KeyFormProps) {
  const [values, setValues] =
    useState<TF2KeyFormValues>(initialValues);

  function updateField(
    field: keyof Omit<TF2KeyFormValues, "isActive">,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /*
     * UI only for now.
     * Saving will later be handled by FastAPI.
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
            اطلاعات محصول
          </h2>

          <p className={styles.formSectionDescription}>
            نام و توضیحات محصول TF2 Key.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div
            className={`${styles.formField} ${styles.formFieldFull}`}
          >
            <label htmlFor="name">
              نام محصول
            </label>

            <input
              id="name"
              type="text"
              required
              value={values.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value,
                )
              }
            />
          </div>

          <div
            className={`${styles.formField} ${styles.formFieldFull}`}
          >
            <label htmlFor="description">
              توضیحات
            </label>

            <textarea
              id="description"
              rows={5}
              required
              value={values.description}
              onChange={(event) =>
                updateField(
                  "description",
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
            موجودی و وضعیت
          </h2>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="stockQuantity">
              Stock
            </label>

            <input
              id="stockQuantity"
              type="number"
              min="0"
              step="1"
              required
              dir="ltr"
              value={values.stockQuantity}
              onChange={(event) =>
                updateField(
                  "stockQuantity",
                  event.target.value,
                )
              }
            />
          </div>

          <div
            className={`${styles.formField} ${styles.formFieldFull}`}
          >
            <label className={styles.adminCheckboxRow}>
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    isActive:
                      event.target.checked,
                  }))
                }
              />

              نمایش TF2 Key در فروشگاه
            </label>

            <span className={styles.formFieldHint}>
              اگر غیرفعال باشد، محصول در فروشگاه عمومی
              قابل خرید نخواهد بود.
            </span>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            قیمت فروش
          </h2>

          <p className={styles.formSectionDescription}>
            مبلغی که مشتری برای خرید TF2 Key از
            IRStore24 پرداخت می‌کند.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="sellPriceToman">
              Sell Price — TOMAN
            </label>

            <input
              id="sellPriceToman"
              type="number"
              min="0"
              step="1"
              required
              dir="ltr"
              value={values.sellPriceToman}
              onChange={(event) =>
                updateField(
                  "sellPriceToman",
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="sellPriceUsdt">
              Sell Price — USDT
            </label>

            <input
              id="sellPriceUsdt"
              type="number"
              min="0"
              step="0.01"
              required
              dir="ltr"
              value={values.sellPriceUsdt}
              onChange={(event) =>
                updateField(
                  "sellPriceUsdt",
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
            قیمت خرید
          </h2>

          <p className={styles.formSectionDescription}>
            مبلغی که IRStore24 برای خرید TF2 Key از
            مشتری پرداخت می‌کند.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="buyPriceToman">
              Buy Price — TOMAN
            </label>

            <input
              id="buyPriceToman"
              type="number"
              min="0"
              step="1"
              required
              dir="ltr"
              value={values.buyPriceToman}
              onChange={(event) =>
                updateField(
                  "buyPriceToman",
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="buyPriceUsdt">
              Buy Price — USDT
            </label>

            <input
              id="buyPriceUsdt"
              type="number"
              min="0"
              step="0.01"
              required
              dir="ltr"
              value={values.buyPriceUsdt}
              onChange={(event) =>
                updateField(
                  "buyPriceUsdt",
                  event.target.value,
                )
              }
            />
          </div>
        </div>
      </section>

      <div className={styles.formActions}>
        <Link
          href="/admin/tf2-keys"
          className={styles.secondaryAdminButton}
        >
          انصراف
        </Link>

        <button
          type="submit"
          className={styles.primaryAdminButton}
        >
          ذخیره تغییرات
        </button>
      </div>

      <p className={styles.formNotice}>
        ذخیره واقعی اطلاعات بعداً از طریق FastAPI انجام
        خواهد شد.
      </p>
    </form>
  );
}
