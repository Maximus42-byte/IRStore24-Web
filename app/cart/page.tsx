import CartView from "../../components/store/CartView";

import styles from "./page.module.css";

export default function CartPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          Shopping Cart
        </span>

        <h1 className={styles.title}>
          سبد خرید
        </h1>

        <p className={styles.description}>
          آیتم‌های انتخاب‌شده، تعداد و قیمت فعلی آن‌ها را
          بررسی کنید. قیمت نهایی هنگام شروع خرید توسط
          Backend دوباره محاسبه خواهد شد.
        </p>
      </header>

      <CartView />
    </div>
  );
}
