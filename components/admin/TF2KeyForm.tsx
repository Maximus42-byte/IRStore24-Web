"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, uploadProductImage, type AdminTF2Key, type Currency } from "../../lib/api";
import ProductImageInput from "./ProductImageInput";
import styles from "../../app/admin/admin.module.css";

export default function TF2KeyForm({ item }: { item?: AdminTF2Key }) {
  const [stock, setStock] = useState(String(item?.stock_quantity ?? 0));
  const [sellAmount, setSellAmount] = useState(item?.sell_price.amount ?? "");
  const [sellCurrency, setSellCurrency] = useState<Currency>(item?.sell_price.currency ?? "USDT");
  const [buyAmount, setBuyAmount] = useState(item?.buy_price.amount ?? "");
  const [buyCurrency, setBuyCurrency] = useState<Currency>(item?.buy_price.currency ?? "USDT");
  const [imagePath, setImagePath] = useState<string | null>(item?.image_path ?? null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [active, setActive] = useState(item?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const path = imageFile ? await uploadProductImage("tf2", imageFile) : imagePath;
      await api<AdminTF2Key>(item ? `/api/admin/tf2-keys/${item.id}` : "/api/admin/tf2-keys", {
        method: item ? "PATCH" : "POST",
        body: {
          stock_quantity: Number(stock),
          sell_price_amount: sellAmount, sell_price_currency: sellCurrency,
          buy_price_amount: buyAmount, buy_price_currency: buyCurrency,
          image_path: path, is_active: active,
        },
      });
      router.push("/admin/tf2-keys");
      router.refresh();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return <form className={styles.adminForm} onSubmit={submit}>
    <section className={styles.formSection}>
      <h2 className={styles.formSectionTitle}>کلید TF2</h2>
      <p className={styles.formSectionDescription}>موجودی و قیمت‌ها را تعیین کنید.</p>
      <div className={styles.formGrid}>
        <div className={styles.formField}>
          <label htmlFor="stock">موجودی</label>
          <input id="stock" type="number" min="0" required value={stock} onChange={event => setStock(event.target.value)} />
        </div>
        {(["sell", "buy"] as const).map(kind => {
          const amount = kind === "sell" ? sellAmount : buyAmount;
          const setAmount = kind === "sell" ? setSellAmount : setBuyAmount;
          const currency = kind === "sell" ? sellCurrency : buyCurrency;
          const setCurrency = kind === "sell" ? setSellCurrency : setBuyCurrency;
          return <div className={styles.formField} key={kind}>
            <label htmlFor={kind}>{kind === "sell" ? "قیمت فروش" : "قیمت خرید"}</label>
            <input id={kind} type="number" min="0.00000001" step="0.00000001" required
              value={amount} onChange={event => setAmount(event.target.value)} />
            <select aria-label={`${kind} currency`} value={currency}
              onChange={event => setCurrency(event.target.value as Currency)}>
              <option value="USDT">USDT</option><option value="TOMAN">TOMAN</option>
            </select>
          </div>;
        })}
        <ProductImageInput kind="tf2" path={imagePath} file={imageFile}
          onPathChange={setImagePath} onFileChange={setImageFile} />
      </div>
      <label className={styles.adminCheckboxRow}>
        <input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)} /> فعال
      </label>
    </section>
    {error && <p role="alert">{error}</p>}
    <div className={styles.formActions}>
      <Link href="/admin/tf2-keys" className={styles.secondaryAdminButton}>انصراف</Link>
      <button type="submit" className={styles.primaryAdminButton} disabled={busy}>
        {busy ? "در حال ذخیره…" : "ذخیره"}
      </button>
    </div>
  </form>;
}
