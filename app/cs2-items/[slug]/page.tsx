import Link from "next/link";
import { notFound } from "next/navigation";

import ItemPurchaseActions from "../../../components/store/ItemPurchaseActions";
import {
  getMockCs2ItemBySlug,
  publicMockCs2Items,
} from "../../../data/mockCs2Items";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function generateStaticParams() {
  return publicMockCs2Items.map((item) => ({
    slug: item.slug,
  }));
}

export default async function CS2ItemPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const item = getMockCs2ItemBySlug(slug);

  if (!item || !item.isActive) {
    notFound();
  }

  const available = item.stockQuantity > 0;

  return (
    <div className={styles.page}>
      <Link href="/cs2-items" className={styles.backLink}>
        ← بازگشت به آیتم‌های CS2
      </Link>

      <div className={styles.product}>
        <section className={styles.imagePanel}>
          <div className={styles.imageGlow} />

          <div className={styles.weaponPlaceholder}>
            {item.weapon}
          </div>
        </section>

        <section className={styles.info}>
          <div className={styles.statusRow}>
            <span className={styles.category}>
              CS2 Item
            </span>

            <span
              className={
                available
                  ? styles.stockBadge
                  : styles.outOfStockBadge
              }
            >
              {available
                ? `موجودی ${item.stockQuantity}`
                : "ناموجود"}
            </span>
          </div>

          <h1 className={styles.title}>
            {item.name}
          </h1>

          <p className={styles.description}>
            {item.description}
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>
                Weapon
              </div>

              <div className={styles.metaValue}>
                {item.weapon}
              </div>
            </div>

            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>
                Exterior
              </div>

              <div className={styles.metaValue}>
                {item.exterior}
              </div>
            </div>

            <div className={styles.metaBox}>
              <div className={styles.metaLabel}>
                Float
              </div>

              <div className={styles.metaValue}>
                {item.floatValue}
              </div>
            </div>
          </div>

          <div className={styles.prices}>
            <div className={styles.priceCard}>
              <p className={styles.priceTitle}>
                خرید از IRStore24
              </p>

              <div className={styles.priceMain}>
                {formatToman(item.sellPriceToman)} تومان
              </div>

              <div className={styles.priceSecondary}>
                {item.sellPriceUsdt} USDT
              </div>
            </div>

            <div className={styles.priceCard}>
              <p className={styles.priceTitle}>
                فروش به IRStore24
              </p>

              <div className={styles.priceMain}>
                {formatToman(item.buyPriceToman)} تومان
              </div>

              <div className={styles.priceSecondary}>
                {item.buyPriceUsdt} USDT
              </div>
            </div>
          </div>

          <ItemPurchaseActions
            stockQuantity={item.stockQuantity}
          />

          <div className={styles.notice}>
            قیمت‌ها در حال حاضر Mock هستند. در نسخه نهایی،
            قیمت و موجودی توسط FastAPI و PostgreSQL تأمین
            می‌شوند و مبلغ نهایی در زمان شروع خرید دوباره
            بررسی خواهد شد.
          </div>
        </section>
      </div>
    </div>
  );
}
