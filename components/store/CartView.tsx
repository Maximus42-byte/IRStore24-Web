"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { mockCs2Items } from "../../data/mockCs2Items";
import { mockTf2Key } from "../../data/mockTf2Key";

import styles from "../../app/cart/page.module.css";

type CartEntry =
  | {
      key: string;
      type: "cs2";
      productId: number;
      name: string;
      subtitle: string;
      quantity: number;
      stockQuantity: number;
      unitPriceToman: number;
      unitPriceUsdt: number;
      href: string;
    }
  | {
      key: string;
      type: "tf2";
      productId: number;
      name: string;
      subtitle: string;
      quantity: number;
      stockQuantity: number;
      unitPriceToman: number;
      unitPriceUsdt: number;
      href: string;
    };

const ak47 = mockCs2Items.find(
  (item) => item.slug === "ak47-redline-ft",
)!;

const awp = mockCs2Items.find(
  (item) => item.slug === "awp-asiimov-ft",
)!;

const initialCart: CartEntry[] = [
  {
    key: `cs2-${ak47.id}`,
    type: "cs2",
    productId: ak47.id,
    name: ak47.name,
    subtitle: `${ak47.exterior} · Float ${ak47.floatValue}`,
    quantity: 1,
    stockQuantity: ak47.stockQuantity,
    unitPriceToman: ak47.sellPriceToman,
    unitPriceUsdt: ak47.sellPriceUsdt,
    href: `/cs2-items/${ak47.slug}`,
  },
  {
    key: `cs2-${awp.id}`,
    type: "cs2",
    productId: awp.id,
    name: awp.name,
    subtitle: `${awp.exterior} · Float ${awp.floatValue}`,
    quantity: 1,
    stockQuantity: awp.stockQuantity,
    unitPriceToman: awp.sellPriceToman,
    unitPriceUsdt: awp.sellPriceUsdt,
    href: `/cs2-items/${awp.slug}`,
  },
  {
    key: `tf2-${mockTf2Key.id}`,
    type: "tf2",
    productId: mockTf2Key.id,
    name: mockTf2Key.name,
    subtitle: "TF2 Key",
    quantity: 5,
    stockQuantity: mockTf2Key.stockQuantity,
    unitPriceToman: mockTf2Key.sellPriceToman,
    unitPriceUsdt: mockTf2Key.sellPriceUsdt,
    href: "/tf2-keys",
  },
];

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatUsdt(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CartView() {
  const [items, setItems] =
    useState<CartEntry[]>(initialCart);

  function changeQuantity(
    key: string,
    nextQuantity: number,
  ) {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) {
          return item;
        }

        const quantity = Math.max(
          1,
          Math.min(item.stockQuantity, nextQuantity),
        );

        return {
          ...item,
          quantity,
        };
      }),
    );
  }

  function removeItem(key: string) {
    setItems((current) =>
      current.filter((item) => item.key !== key),
    );
  }

  const totals = useMemo(() => {
    return items.reduce(
      (result, item) => {
        result.toman +=
          item.unitPriceToman * item.quantity;

        result.usdt +=
          item.unitPriceUsdt * item.quantity;

        result.quantity += item.quantity;

        return result;
      },
      {
        toman: 0,
        usdt: 0,
        quantity: 0,
      },
    );
  }, [items]);

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>0</div>

        <h2 className={styles.emptyTitle}>
          سبد خرید خالی است
        </h2>

        <p className={styles.emptyDescription}>
          هنوز آیتمی به سبد خرید اضافه نکرده‌اید.
        </p>

        <Link
          href="/cs2-items"
          className={styles.shopButton}
        >
          مشاهده آیتم‌های CS2
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <section className={styles.items}>
        {items.map((item) => (
          <article
            key={item.key}
            className={styles.item}
          >
            <Link
              href={item.href}
              className={styles.itemVisual}
            >
              {item.type === "cs2"
                ? "CS2"
                : "KEY"}
            </Link>

            <div className={styles.itemInfo}>
              <div className={styles.itemTop}>
                <div>
                  <Link
                    href={item.href}
                    className={styles.itemName}
                  >
                    {item.name}
                  </Link>

                  <p className={styles.itemMeta}>
                    {item.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.removeButton}
                  onClick={() =>
                    removeItem(item.key)
                  }
                >
                  حذف
                </button>
              </div>

              <div className={styles.itemBottom}>
                <div className={styles.price}>
                  <span className={styles.priceMain}>
                    {formatToman(
                      item.unitPriceToman,
                    )}{" "}
                    تومان
                  </span>

                  <span
                    className={styles.priceSecondary}
                  >
                    {formatUsdt(
                      item.unitPriceUsdt,
                    )}{" "}
                    USDT
                  </span>
                </div>

                <div
                  className={styles.quantityControl}
                >
                  <button
                    type="button"
                    className={styles.quantityButton}
                    disabled={item.quantity <= 1}
                    onClick={() =>
                      changeQuantity(
                        item.key,
                        item.quantity - 1,
                      )
                    }
                  >
                    −
                  </button>

                  <span className={styles.quantity}>
                    {item.quantity}
                  </span>

                  <button
                    type="button"
                    className={styles.quantityButton}
                    disabled={
                      item.quantity >=
                      item.stockQuantity
                    }
                    onClick={() =>
                      changeQuantity(
                        item.key,
                        item.quantity + 1,
                      )
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.stockHint}>
                موجودی فعلی: {item.stockQuantity}
              </div>
            </div>
          </article>
        ))}
      </section>

      <aside className={styles.summary}>
        <h2 className={styles.summaryTitle}>
          خلاصه سبد خرید
        </h2>

        <div className={styles.summaryRow}>
          <span>تعداد کل</span>
          <strong>{totals.quantity}</strong>
        </div>

        <div className={styles.divider} />

        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>
            مجموع تومان
          </span>

          <strong className={styles.totalValue}>
            {formatToman(totals.toman)} تومان
          </strong>
        </div>

        <div className={styles.totalBlock}>
          <span className={styles.totalLabel}>
            مجموع USDT
          </span>

          <strong className={styles.totalUsdt}>
            {formatUsdt(totals.usdt)} USDT
          </strong>
        </div>

        <button
          type="button"
          className={styles.buyButton}
        >
          خرید
        </button>

        <p className={styles.notice}>
          قیمت‌های سبد خرید Live هستند و تا قبل از شروع
          خرید می‌توانند تغییر کنند. در نسخه نهایی،
          FastAPI قیمت و موجودی را هنگام زدن دکمه خرید
          دوباره بررسی می‌کند.
        </p>
      </aside>
    </div>
  );
}
