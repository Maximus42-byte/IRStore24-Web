import CS2Catalog from "../../components/store/CS2Catalog";
import styles from "./page.module.css";

export default function CS2ItemsPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>CS2 Marketplace</span>

        <h1 className={styles.title}>آیتم‌های CS2</h1>

        <p className={styles.description}>
          آیتم‌های موجود را براساس Weapon، Exterior، Float و قیمت
          جستجو و فیلتر کنید. قیمت خرید و فروش هر آیتم به تومان و USDT
          نمایش داده می‌شود.
        </p>
      </header>

      <CS2Catalog />
    </div>
  );
}
