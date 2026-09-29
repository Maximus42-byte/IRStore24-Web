import { notFound } from "next/navigation";

import CS2ItemForm from "../../../../../components/admin/CS2ItemForm";
import { getMockCs2ItemBySlug } from "../../../../../data/mockCs2Items";

import styles from "../../../admin.module.css";

type EditCS2ItemPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EditCS2ItemPage({
  params,
}: EditCS2ItemPageProps) {
  const { slug } = await params;

  const item = getMockCs2ItemBySlug(slug);

  if (!item) {
    notFound();
  }

  return (
    <>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          Admin / CS2 Items / Edit
        </span>

        <h1 className={styles.pageTitle}>
          ویرایش {item.name}
        </h1>

        <p className={styles.pageDescription}>
          اطلاعات، موجودی و قیمت‌های این آیتم را ویرایش کنید.
        </p>
      </header>

      <CS2ItemForm
        mode="edit"
        initialValues={{
          name: item.name,
          slug: item.slug,
          description: item.description,
          weapon: item.weapon,
          exterior: item.exterior,
          floatValue: String(item.floatValue),
          stockQuantity: String(item.stockQuantity),
          isActive: item.isActive,
          sellPriceToman: String(item.sellPriceToman),
          sellPriceUsdt: String(item.sellPriceUsdt),
          buyPriceToman: String(item.buyPriceToman),
          buyPriceUsdt: String(item.buyPriceUsdt),
        }}
      />
    </>
  );
}
