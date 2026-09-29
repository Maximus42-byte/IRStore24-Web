import CS2ItemForm from "../../../../components/admin/CS2ItemForm";

import styles from "../../admin.module.css";

export default function NewCS2ItemPage() {
  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / CS2 Items / New
        </span>

        <h1 className={styles.pageTitle}>
          افزودن آیتم CS2
        </h1>

        <p className={styles.pageDescription}>
          اطلاعات آیتم، موجودی و قیمت خرید و فروش را وارد
          کنید.
        </p>
      </header>

      <CS2ItemForm mode="create" />
    </>
  );
}
