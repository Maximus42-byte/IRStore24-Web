"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, errorMessage, uploadProductImage, type AdminCS2Item, type Currency, type Exterior } from "../../lib/api";
import styles from "../../app/admin/admin.module.css";
import ProductImageInput from "./ProductImageInput";
const exteriors: Exterior[] = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
type Values = { slug: string; name: string; description: string; weapon: string; exterior: Exterior; float_value: string; stock_quantity: string; sell_price_amount: string; sell_price_currency: Currency; buy_price_amount: string; buy_price_currency: Currency; image_path: string; is_active: boolean };
const empty: Values = { slug: "", name: "", description: "", weapon: "", exterior: "Field-Tested", float_value: "", stock_quantity: "0", sell_price_amount: "", sell_price_currency: "USDT", buy_price_amount: "", buy_price_currency: "USDT", image_path: "", is_active: true };
export default function CS2ItemForm({ mode, item }: { mode: "create" | "edit"; item?: AdminCS2Item }) {
  const [values, setValues] = useState<Values>(item ? { slug: item.slug, name: item.name, description: item.description || "", weapon: item.weapon, exterior: item.exterior, float_value: item.float_value, stock_quantity: String(item.stock_quantity), sell_price_amount: item.sell_price.amount, sell_price_currency: item.sell_price.currency, buy_price_amount: item.buy_price.amount, buy_price_currency: item.buy_price.currency, image_path: item.image_path || "", is_active: item.is_active } : empty);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const [imageFile, setImageFile] = useState<File | null>(null); const router = useRouter();
  function set<K extends keyof Values>(key: K, value: Values[K]) { setValues(current => ({ ...current, [key]: value })); }
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); try {
    const imagePath = imageFile ? await uploadProductImage("cs2", imageFile) : values.image_path || null;
    await api<AdminCS2Item>(item ? `/api/admin/cs2-items/${item.id}` : "/api/admin/cs2-items", { method: item ? "PATCH" : "POST", body: { ...values, stock_quantity: Number(values.stock_quantity), description: values.description || null, image_path: imagePath } });
    router.push("/admin/cs2-items"); router.refresh();
  } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); } }
  return <form className={styles.adminForm} onSubmit={submit}><section className={styles.formSection}><div className={styles.formSectionHeader}><h2 className={styles.formSectionTitle}>{mode === "create" ? "افزودن آیتم جدید" : "ویرایش آیتم"}</h2><p className={styles.formSectionDescription}>اطلاعات، موجودی و قیمت‌های آیتم</p></div><div className={styles.formGrid}>
    {([["name","نام آیتم"],["slug","Slug"],["weapon","Weapon"],["float_value","Float"],["stock_quantity","موجودی"]] as const).map(([key,label]) => <div className={styles.formField} key={key}><label htmlFor={key}>{label}</label><input id={key} value={values[key]} onChange={e => set(key,e.target.value)} required dir={key === "slug" ? "ltr" : undefined} type={key === "float_value" || key === "stock_quantity" ? "number" : "text"} min={key === "float_value" || key === "stock_quantity" ? "0" : undefined} max={key === "float_value" ? "1" : undefined} step={key === "float_value" ? "0.00000001" : key === "stock_quantity" ? "1" : undefined} pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined} /></div>)}
    <div className={styles.formField}><label htmlFor="exterior">Exterior</label><select id="exterior" value={values.exterior} onChange={e => set("exterior",e.target.value as Exterior)}>{exteriors.map(value => <option key={value}>{value}</option>)}</select></div>
    <div className={`${styles.formField} ${styles.formFieldFull}`}><label htmlFor="description">توضیحات</label><textarea id="description" rows={4} value={values.description} onChange={e => set("description",e.target.value)} /></div>
    <ProductImageInput kind="cs2" path={values.image_path || null} file={imageFile} onPathChange={path => set("image_path", path || "")} onFileChange={setImageFile} />
  </div></section><section className={styles.formSection}><h2 className={styles.formSectionTitle}>قیمت‌ها</h2><div className={styles.formGrid}>{(["sell","buy"] as const).map(kind => <div className={styles.formField} key={kind}><label htmlFor={kind}>{kind === "sell" ? "قیمت فروش" : "قیمت خرید"}</label><input id={kind} type="number" min="0.00000001" step="0.00000001" required value={values[`${kind}_price_amount`]} onChange={e => set(`${kind}_price_amount`,e.target.value)} /><select aria-label={`${kind} currency`} value={values[`${kind}_price_currency`]} onChange={e => set(`${kind}_price_currency`,e.target.value as Currency)}><option value="USDT">USDT</option><option value="TOMAN">TOMAN</option></select></div>)}</div></section>
    <label className={styles.adminCheckboxRow}><input type="checkbox" checked={values.is_active} onChange={e => set("is_active",e.target.checked)} /> فعال</label>{error && <p role="alert">{error}</p>}<div className={styles.formActions}><Link href="/admin/cs2-items" className={styles.secondaryAdminButton}>انصراف</Link><button type="submit" disabled={busy} className={styles.primaryAdminButton}>{busy ? "در حال ذخیره…" : "ذخیره"}</button></div>
  </form>;
}
