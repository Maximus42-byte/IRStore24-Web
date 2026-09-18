import Link from "next/link";
import styles from "./page.module.css";

const featuredItems = [
  {
    slug: "ak47-redline-ft",
    name: "AK-47 | Redline",
    weapon: "AK-47",
    exterior: "Field-Tested",
    float: "0.231284",
    stock: 3,
    sellToman: "8,500,000",
    sellUsdt: "85",
  },
  {
    slug: "awp-asiimov-ft",
    name: "AWP | Asiimov",
    weapon: "AWP",
    exterior: "Field-Tested",
    float: "0.284901",
    stock: 2,
    sellToman: "12,000,000",
    sellUsdt: "120",
  },
  {
    slug: "m4a1s-printstream-mw",
    name: "M4A1-S | Printstream",
    weapon: "M4A1-S",
    exterior: "Minimal Wear",
    float: "0.094815",
    stock: 1,
    sellToman: "10,200,000",
    sellUsdt: "102",
  },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroContent}>
            <span className={styles.eyebrow}>
              CS2 & TF2 Marketplace
            </span>

            <h1 className={styles.heroTitle}>
              خرید و فروش آیتم‌های{" "}
              <span className={styles.heroTitleAccent}>CS2</span>
            </h1>

            <p className={styles.heroDescription}>
              آیتم‌های CS2 و کلیدهای TF2 را با قیمت شفاف به تومان و USDT
              مشاهده کنید، به سبد خرید اضافه کنید و خرید خود را از طریق
              IRStore24 تکمیل کنید.
            </p>

            <div className={styles.heroActions}>
              <Link
                href="/cs2-items"
                className={styles.primaryButton}
              >
                مشاهده آیتم‌های CS2
              </Link>

              <Link
                href="/tf2-keys"
                className={styles.secondaryButton}
              >
                قیمت کلید TF2
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.visualGlow} />

            <div className={styles.visualCard}>
              <div className={styles.visualTop}>
                <span className={styles.visualBadge}>
                  موجود
                </span>

                <span className={styles.visualCategory}>
                  Featured Item
                </span>
              </div>

              <div className={styles.weaponDisplay}>
                AK-47
              </div>

              <div className={styles.visualInfo}>
                <h2 className={styles.visualName}>
                  AK-47 | Redline
                </h2>

                <p className={styles.visualMeta}>
                  Field-Tested · Float 0.231284
                </p>

                <div className={styles.visualPriceRow}>
                  <div>
                    <div className={styles.visualPriceLabel}>
                      تومان
                    </div>

                    <div className={styles.visualPrice}>
                      8,500,000
                    </div>
                  </div>

                  <div>
                    <div className={styles.visualPriceLabel}>
                      USDT
                    </div>

                    <div className={styles.visualPrice}>
                      85
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>
                آیتم‌های منتخب CS2
              </h2>

              <p className={styles.sectionDescription}>
                نمونه‌ای از آیتم‌های موجود فروشگاه. این اطلاعات بعداً
                مستقیماً از Backend دریافت خواهند شد.
              </p>
            </div>

            <Link
              href="/cs2-items"
              className={styles.sectionLink}
            >
              مشاهده همه آیتم‌ها
            </Link>
          </div>

          <div className={styles.itemGrid}>
            {featuredItems.map((item) => (
              <Link
                key={item.slug}
                href={`/cs2-items/${item.slug}`}
                className={styles.itemCard}
              >
                <div className={styles.itemImage}>
                  {item.weapon}
                </div>

                <div className={styles.itemBody}>
                  <div className={styles.itemTopRow}>
                    <h3 className={styles.itemName}>
                      {item.name}
                    </h3>

                    <span className={styles.stockBadge}>
                      موجودی {item.stock}
                    </span>
                  </div>

                  <p className={styles.itemMeta}>
                    {item.exterior} · Float {item.float}
                  </p>

                  <div className={styles.priceBlock}>
                    <div className={styles.priceBox}>
                      <div className={styles.priceLabel}>
                        قیمت فروش
                      </div>

                      <div className={styles.priceValue}>
                        {item.sellToman} تومان
                      </div>
                    </div>

                    <div className={styles.priceBox}>
                      <div className={styles.priceLabel}>
                        USDT
                      </div>

                      <div className={styles.priceValue}>
                        {item.sellUsdt} USDT
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionAlt}>
        <div className={styles.sectionInner}>
          <div className={styles.tf2Card}>
            <div className={styles.tf2Visual}>
              KEY
            </div>

            <div>
              <span className={styles.eyebrow}>
                Team Fortress 2
              </span>

              <h2 className={styles.tf2Title}>
                خرید و فروش کلید TF2
              </h2>

              <p className={styles.tf2Description}>
                قیمت خرید و فروش کلید TF2 به تومان و USDT نمایش داده
                می‌شود و موجودی فروشگاه نیز همیشه مشخص خواهد بود.
              </p>

              <div className={styles.tf2Prices}>
                <div className={styles.tf2Price}>
                  <div className={styles.priceLabel}>
                    قیمت فروش
                  </div>

                  <div className={styles.priceValue}>
                    قیمت Live از Backend
                  </div>
                </div>

                <div className={styles.tf2Price}>
                  <div className={styles.priceLabel}>
                    قیمت خرید
                  </div>

                  <div className={styles.priceValue}>
                    قیمت Live از Backend
                  </div>
                </div>
              </div>

              <div className={styles.heroActions}>
                <Link
                  href="/tf2-keys"
                  className={styles.primaryButton}
                >
                  مشاهده کلید TF2
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.supportCard}>
            <span className={styles.eyebrow}>
              Support
            </span>

            <h2 className={styles.supportTitle}>
              سوالی دارید؟
            </h2>

            <p className={styles.supportDescription}>
              برای هماهنگی خرید، فروش یا دریافت پشتیبانی می‌توانید از
              طریق Telegram یا Instagram با IRStore24 در ارتباط باشید.
            </p>

            <div className={styles.supportActions}>
              <a
                href="https://t.me/IRStoore"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryButton}
              >
                Telegram
              </a>

              <a
                href="https://www.instagram.com/irstore_community?igsh=MTZjYzk2bWFqNTdsbg%3D%3D&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.secondaryButton}
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}