"use client";

import { useState } from "react";

import { mockTf2Key } from "../../data/mockTf2Key";

import styles from "./page.module.css";

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function TF2KeysPage() {
  const key = mockTf2Key;

  const available =
    key.isActive && key.stockQuantity > 0;

  const [quantity, setQuantity] = useState(
    available ? 1 : 0,
  );

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1),
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(key.stockQuantity, current + 1),
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Team Fortress 2
        </span>

        <h1 className={styles.title}>
          کلید TF2
        </h1>

        <p className={styles.description}>
          قیمت خرید و فروش کلید TF2 را به تومان و USDT مشاهده کنید.
          موجودی فروشگاه نیز به‌صورت مشخص نمایش داده می‌شود.
        </p>
      </header>

      <div className={styles.product}>
        <section className={styles.visual}>
          <div className={styles.visualGlow} />

          <div className={styles.keyIcon}>
            KEY
          </div>
        </section>

        <section className={styles.info}>
          <div className={styles.statusRow}>
            <span className={styles.category}>
              TF2 Key
            </span>

            <span
              className={
                available
                  ? styles.stock
                  : styles.outOfStock
              }
            >
              {available
                ? `موجودی ${key.stockQuantity}`
                : "ناموجود"}
            </span>
          </div>

          <h2 className={styles.productTitle}>
            {key.name}
          </h2>

          <p className={styles.productDescription}>
            {key.description}
          </p>

          <div className={styles.prices}>
            <div className={styles.priceCard}>
              <div className={styles.priceLabel}>
                خرید از IRStore24
              </div>

              <div className={styles.priceToman}>
                {formatToman(key.sellPriceToman)} تومان
              </div>

              <div className={styles.priceUsdt}>
                {key.sellPriceUsdt} USDT
              </div>
            </div>

            <div className={styles.priceCard}>
              <div className={styles.priceLabel}>
                فروش به IRStore24
              </div>

              <div className={styles.priceToman}>
                {formatToman(key.buyPriceToman)} تومان
              </div>

              <div className={styles.priceUsdt}>
                {key.buyPriceUsdt} USDT
              </div>
            </div>
          </div>

          <div className={styles.purchase}>
            {available && (
              <div className={styles.quantityRow}>
                <span className={styles.quantityLabel}>
                  تعداد
                </span>

                <div className={styles.quantityControl}>
                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>

                  <span className={styles.quantity}>
                    {quantity}
                  </span>

                  <button
                    type="button"
                    className={styles.quantityButton}
                    onClick={increaseQuantity}
                    disabled={
                      quantity >= key.stockQuantity
                    }
                  >
                    +
                  </button>
                </div>

                <span className={styles.quantityHint}>
                  حداکثر {key.stockQuantity} عدد
                </span>
              </div>
            )}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.buyButton}
                disabled={!available}
              >
                {available
                  ? "افزودن به سبد خرید"
                  : "ناموجود"}
              </button>

              <button
                type="button"
                className={styles.sellButton}
              >
                فروش به IRStore24
              </button>
            </div>
          </div>

          <div className={styles.notice}>
            قیمت‌ها و موجودی فعلاً Mock هستند. در نسخه نهایی،
            این اطلاعات از FastAPI و PostgreSQL دریافت می‌شوند
            و قیمت معادل با نرخ مرکزی USDT/Toman محاسبه خواهد شد.
          </div>
        </section>
      </div>
    </div>
  );
}
