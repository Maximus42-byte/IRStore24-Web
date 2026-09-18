import Link from "next/link";

export default function Home() {
  return (
    <>
      <section>
        <h1>IRStore24</h1>
        <p>خرید و فروش آیتم‌های CS2 و کلیدهای TF2</p>

        <Link href="/cs2-items">
          مشاهده آیتم‌های CS2
        </Link>
      </section>

      <section>
        <h2>آیتم‌های CS2</h2>
        <p>آیتم‌های جدید و موجود فروشگاه در این بخش نمایش داده خواهند شد.</p>
      </section>

      <section>
        <h2>کلید TF2</h2>
        <p>قیمت خرید، فروش و موجودی کلیدهای TF2.</p>

        <Link href="/tf2-keys">
          مشاهده کلید TF2
        </Link>
      </section>
    </>
  );
}
