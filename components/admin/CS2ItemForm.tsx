"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import styles from "../../app/admin/admin.module.css";

const exteriorOptions = [
  "Factory New",
  "Minimal Wear",
  "Field-Tested",
  "Well-Worn",
  "Battle-Scarred",
];

type CS2ItemFormValues = {
  name: string;
  slug: string;
  description: string;
  weapon: string;
  exterior: string;
  floatValue: string;
  stockQuantity: string;
  isActive: boolean;
  sellPriceToman: string;
  sellPriceUsdt: string;
  buyPriceToman: string;
  buyPriceUsdt: string;
};

type CS2ItemFormProps = {
  mode: "create" | "edit";
  initialValues?: Partial<CS2ItemFormValues>;
};

const emptyValues: CS2ItemFormValues = {
  name: "",
  slug: "",
  description: "",
  weapon: "",
  exterior: "Field-Tested",
  floatValue: "",
  stockQuantity: "0",
  isActive: true,
  sellPriceToman: "",
  sellPriceUsdt: "",
  buyPriceToman: "",
  buyPriceUsdt: "",
};

export default function CS2ItemForm({
  mode,
  initialValues,
}: CS2ItemFormProps) {
  const [values, setValues] =
    useState<CS2ItemFormValues>({
      ...emptyValues,
      ...initialValues,
    });

  function updateField(
    field: keyof CS2ItemFormValues,
    value: string,
  ) {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateActive(value: boolean) {
    setValues((current) => ({
      ...current,
      isActive: value,
    }));
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    /*
     * UI only for now.
     * This will later call FastAPI.
     */
  }

  const title =
    mode === "create"
      ? "افزودن آیتم جدید"
      : "ویرایش آیتم";

  const buttonLabel =
    mode === "create"
      ? "افزودن آیتم"
      : "ذخیره تغییرات";

  return (
    <form
      className={styles.adminForm}
      onSubmit={handleSubmit}
    >
      <section className={styles.formSection}>
        <div className={styles.formSectionHeader}>
          <h2 className={styles.formSectionTitle}>
            اطلاعات اصلی
          </h2>

          <p className={styles.formSectionDescription}>
            نام، Weapon، Exterior و مشخصات عمومی آیتم.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="name">
              نام آیتم
            </label>

            <input
              id="name"
              type="text"
              required
              placeholder="AK-47 | Redline"
              value={values.name}
              onChange={(event) =>
                updateField(
                  "name",
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="slug">
              Slug
            </label>

            <input
              id="slug"
              type="text"
              required
              dir="ltr"
              placeholder="ak47-redline-ft"
              value={values.slug}
              onChange={(event) =>
                updateField(
                  "slug",
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="weapon">
              Weapon
            </label>

            <input
              id="weapon"
              type="text"
              required
              placeholder="AK-47"
              value={values.weapon}
              onChange={(event) =>
                updateField(
                  "weapon",
                  event.target.value,
                )
              }
            />
          </div>

          <div className={styles.formField}>
            <label htmlFor="exterior">
              Exterior
            </label>

            <select
              id="exterior"
              value={values.exterior}
              onChange={(event) =>
                updateField(
                  "exterior",
                  event.target.value,
                )
              }
            >
              {exteriorOptions.map((exterior) => (
                <option
                  key={exterior}
                  value={exterior}
                >
                  {exterior}
                </option>
              ))}
            </select>
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
              placeholder="توضیحات آیتم..."
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
            Float و موجودی
          </h2>

          <p className={styles.formSectionDescription}>
            Float باید بین 0 و 1 باشد.
          </p>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.formField}>
            <label htmlFor="floatValue">
              Float
            </label>

            <input
              id="floatValue"
              type="number"
              min="0"
              max="1"
              step="0.000001"
              required
              dir="ltr"
              placeholder="0.231284"
              value={values.floatValue}
              onChange={(event) =>
                updateField(
                  "floatValue",
                  event.target.value,
                )
              }
            />
          </div>

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
                  updateActive(event.target.checked)
                }
              />

              نمایش آیتم در فروشگاه
            </label>

            <span className={styles.formFieldHint}>
              اگر غیرفعال باشد، آیتم در Catalog عمومی نمایش داده
              نمی‌شود و صفحه عمومی آن نیز در دسترس نخواهد بود.
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
            مبلغی که مشتری برای خرید از IRStore24
            پرداخت می‌کند.
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
              required
              dir="ltr"
              placeholder="8500000"
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
              placeholder="85"
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
            مبلغی که IRStore24 برای خرید آیتم از مشتری
            پرداخت می‌کند.
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
              required
              dir="ltr"
              placeholder="7500000"
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
              placeholder="75"
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
          href="/admin/cs2-items"
          className={styles.secondaryAdminButton}
        >
          انصراف
        </Link>

        <button
          type="submit"
          className={styles.primaryAdminButton}
        >
          {buttonLabel}
        </button>
      </div>

      <p className={styles.formNotice}>
        {title} فعلاً فقط Frontend UI است. ذخیره واقعی
        بعداً از طریق FastAPI انجام خواهد شد.
      </p>
    </form>
  );
}
