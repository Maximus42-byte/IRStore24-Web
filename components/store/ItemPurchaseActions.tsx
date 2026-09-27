"use client";

import { useState } from "react";
import styles from "../../app/cs2-items/[slug]/page.module.css";

type ItemPurchaseActionsProps = {
  stockQuantity: number;
};

export default function ItemPurchaseActions({
  stockQuantity,
}: ItemPurchaseActionsProps) {
  const available = stockQuantity > 0;
  const [quantity, setQuantity] = useState(available ? 1 : 0);

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) =>
      Math.min(stockQuantity, current + 1),
    );
  }

  return (
    <div className={styles.purchaseActions}>
      {available && (
        <div className={styles.quantitySection}>
          <span className={styles.quantityLabel}>تعداد</span>

          <div className={styles.quantityControl}>
            <button
              type="button"
              className={styles.quantityButton}
              onClick={decreaseQuantity}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span className={styles.quantityValue}>
              {quantity}
            </span>

            <button
              type="button"
              className={styles.quantityButton}
              onClick={increaseQuantity}
              disabled={quantity >= stockQuantity}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <span className={styles.quantityHint}>
            حداکثر {stockQuantity} عدد
          </span>
        </div>
      )}

      <div className={styles.actionButtons}>
        <button
          type="button"
          className={styles.addToCartButton}
          disabled={!available}
        >
          {available ? "افزودن به سبد خرید" : "ناموجود"}
        </button>

        <button
          type="button"
          className={styles.sellButton}
        >
          فروش به IRStore24
        </button>
      </div>
    </div>
  );
}