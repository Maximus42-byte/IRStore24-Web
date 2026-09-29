import { mockCs2Items } from "../../../data/mockCs2Items";
import Link from "next/link";
import styles from "../admin.module.css";

function formatToman(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default function AdminCs2ItemsPage() {
  const totalStock = mockCs2Items.reduce(
    (sum, item) => sum + item.stockQuantity,
    0,
  );

  const availableItems = mockCs2Items.filter(
    (item) => item.stockQuantity > 0,
  ).length;

  const outOfStockItems =
    mockCs2Items.length - availableItems;

  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / CS2 Items
        </span>

        <div className={styles.adminPageTitleRow}>
          <div>
            <h1 className={styles.pageTitle}>
              مدیریت آیتم‌های CS2
            </h1>

            <p className={styles.pageDescription}>
              مدیریت اطلاعات، Float، موجودی و قیمت خرید و
              فروش آیتم‌های CS2.
            </p>
          </div>

          <Link
            href="/admin/cs2-items/new"
            className={styles.primaryAdminButton}
            >
            + افزودن آیتم
            </Link>
        </div>
      </header>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Total Items
          </div>

          <div className={styles.statValue}>
            {mockCs2Items.length}
          </div>

          <div className={styles.statHint}>
            تعداد Listingها
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Available
          </div>

          <div className={styles.statValue}>
            {availableItems}
          </div>

          <div className={styles.statHint}>
            دارای موجودی
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Out of Stock
          </div>

          <div className={styles.statValue}>
            {outOfStockItems}
          </div>

          <div className={styles.statHint}>
            موجودی صفر
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>
            Total Stock
          </div>

          <div className={styles.statValue}>
            {totalStock}
          </div>

          <div className={styles.statHint}>
            مجموع تعداد موجود
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>
              CS2 Items
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
                <th>Item</th>
                <th>Exterior / Float</th>
                <th>Stock</th>
                <th>Sell Price</th>
                <th>Buy Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {mockCs2Items.map((item) => {
                const available =
                  item.stockQuantity > 0;

                return (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.itemIdentity}>
                        <div
                          className={
                            styles.adminItemThumbnail
                          }
                        >
                          CS2
                        </div>

                        <div>
                          <strong
                            className={styles.itemName}
                          >
                            {item.name}
                          </strong>

                          <span
                            className={styles.itemMeta}
                          >
                            {item.weapon}
                          </span>

                          <span
                            className={styles.itemSlug}
                          >
                            {item.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <strong
                        className={
                          styles.tablePrimaryValue
                        }
                      >
                        {item.exterior}
                      </strong>

                      <span
                        className={
                          styles.tableSecondaryValue
                        }
                      >
                        Float:{" "}
                        {item.floatValue.toFixed(6)}
                      </span>
                    </td>

                    <td>
                      <strong
                        className={
                          styles.stockNumber
                        }
                      >
                        {item.stockQuantity}
                      </strong>
                    </td>

                    <td>
                      <strong
                        className={
                          styles.tablePrimaryValue
                        }
                      >
                        {formatToman(
                          item.sellPriceToman,
                        )}{" "}
                        تومان
                      </strong>

                      <span
                        className={styles.usdtValue}
                      >
                        {item.sellPriceUsdt} USDT
                      </span>
                    </td>

                    <td>
                      <strong
                        className={
                          styles.tablePrimaryValue
                        }
                      >
                        {formatToman(
                          item.buyPriceToman,
                        )}{" "}
                        تومان
                      </strong>

                      <span
                        className={styles.usdtValue}
                      >
                        {item.buyPriceUsdt} USDT
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          available
                            ? styles.statusAvailable
                            : styles.statusUnavailable
                        }
                      >
                        {available
                          ? "موجود"
                          : "ناموجود"}
                      </span>
                    </td>

                    <td>
                      <div
                        className={
                          styles.tableActions
                        }
                      >
                        <Link
                            href={`/admin/cs2-items/${item.slug}/edit`}
                            className={styles.editButton}
                        >
                            ویرایش
                        </Link>
                        
                        <button
                          type="button"
                          className={
                            styles.hideButton
                          }
                          title="بعداً به is_active در Backend متصل می‌شود"
                        >
                          مخفی‌سازی
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
