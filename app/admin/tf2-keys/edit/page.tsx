import TF2KeyForm from "../../../../components/admin/TF2KeyForm";
import { mockTf2Key } from "../../../../data/mockTf2Key";

import styles from "../../admin.module.css";

export default function EditTF2KeyPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / TF2 Keys / Edit
        </span>

        <h1 className={styles.pageTitle}>
          ویرایش TF2 Key
        </h1>

        <p className={styles.pageDescription}>
          موجودی، وضعیت و قیمت‌های خرید و فروش TF2 Key
          را مدیریت کنید.
        </p>
      </header>

      <TF2KeyForm
        initialValues={{
          name: mockTf2Key.name,
          description: mockTf2Key.description,
          stockQuantity: String(
            mockTf2Key.stockQuantity,
          ),
          sellPriceToman: String(
            mockTf2Key.sellPriceToman,
          ),
          sellPriceUsdt: String(
            mockTf2Key.sellPriceUsdt,
          ),
          buyPriceToman: String(
            mockTf2Key.buyPriceToman,
          ),
          buyPriceUsdt: String(
            mockTf2Key.buyPriceUsdt,
          ),
          isActive: mockTf2Key.isActive,
        }}
      />
    </>
  );
}
