import { mockTf2Key } from "../../../data/mockTf2Key";
import Link from "next/link";
import styles from "../admin.module.css";

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function AdminTf2KeysPage() {
  const available =
    mockTf2Key.isActive &&
    mockTf2Key.stockQuantity > 0;

  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / TF2 Keys
        </span>

        <h1 className={styles.pageTitle}>
          مدیریت کلید TF2
        </h1>

        <p className={styles.pageDescription}>
          مدیریت موجودی، وضعیت و قیمت خرید و فروش
          Mann Co. Supply Crate Key.
        </p>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Stock
          </div>

          <div className={styles.statValue}>
            {mockTf2Key.stockQuantity}
          </div>

          <div className={styles.statHint}>
            موجودی فعلی
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Sell Price
          </div>

          <div className={styles.statValue}>
            {mockTf2Key.sellPriceUsdt} USDT
          </div>

          <div className={styles.statHint}>
            {formatToman(mockTf2Key.sellPriceToman)} تومان
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Buy Price
          </div>

          <div className={styles.statValue}>
            {mockTf2Key.buyPriceUsdt} USDT
          </div>

          <div className={styles.statHint}>
            {formatToman(mockTf2Key.buyPriceToman)} تومان
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Status
          </div>

          <div className={styles.statValue}>
            {available ? "Active" : "Inactive"}
          </div>

          <div className={styles.statHint}>
            {mockTf2Key.isActive
              ? mockTf2Key.stockQuantity > 0
                ? "قابل خرید از فروشگاه"
                : "موجودی صفر"
              : "در فروشگاه مخفی است"}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              TF2 Key
            </h2>

            <p className={styles.tableDescription}>
              اطلاعات فعلی از Mock Data خوانده می‌شوند.
            </p>
          </div>
        </div>

        <div className={styles.adminTableWrapper}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>Stock</th>
                <th>Sell Price</th>
                <th>Buy Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>
                  <div className={styles.itemIdentity}>
                    <div
                      className={
                        styles.adminItemThumbnail
                      }
                    >
                      KEY
                    </div>

                    <div>
                      <strong
                        className={styles.itemName}
                      >
                        {mockTf2Key.name}
                      </strong>

                      <span
                        className={styles.itemMeta}
                      >
                        TF2 Key
                      </span>
                    </div>
                  </div>
                </td>

                <td>
                  <strong
                    className={styles.stockNumber}
                  >
                    {mockTf2Key.stockQuantity}
                  </strong>
                </td>

                <td>
                  <strong
                    className={
                      styles.tablePrimaryValue
                    }
                  >
                    {formatToman(
                      mockTf2Key.sellPriceToman,
                    )}{" "}
                    تومان
                  </strong>

                  <span className={styles.usdtValue}>
                    {mockTf2Key.sellPriceUsdt} USDT
                  </span>
                </td>

                <td>
                  <strong
                    className={
                      styles.tablePrimaryValue
                    }
                  >
                    {formatToman(
                      mockTf2Key.buyPriceToman,
                    )}{" "}
                    تومان
                  </strong>

                  <span className={styles.usdtValue}>
                    {mockTf2Key.buyPriceUsdt} USDT
                  </span>
                </td>

                <td>
                  <span
                    className={
                      !mockTf2Key.isActive
                        ? styles.statusHidden
                        : mockTf2Key.stockQuantity > 0
                          ? styles.statusAvailable
                          : styles.statusUnavailable
                    }
                  >
                    {!mockTf2Key.isActive
                      ? "مخفی"
                      : mockTf2Key.stockQuantity > 0
                        ? "موجود"
                        : "ناموجود"}
                  </span>
                </td>

                <td>
                  <div className={styles.tableActions}>
                    <Link
                        href="/admin/tf2-keys/edit"
                        className={styles.editButton}
                    >
                        ویرایش
                    </Link>

                    <button
                      type="button"
                      className={styles.hideButton}
                      title="ذخیره واقعی بعداً توسط FastAPI انجام می‌شود"
                    >
                      {mockTf2Key.isActive
                        ? "مخفی‌سازی"
                        : "فعال‌سازی"}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            توضیحات محصول
          </h2>
        </div>

        <p className={styles.pageDescription}>
          {mockTf2Key.description}
        </p>
      </section>
    </>
  );
}
