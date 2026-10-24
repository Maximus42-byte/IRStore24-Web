"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import ItemPurchaseActions from "../../../components/store/ItemPurchaseActions";
import ProductImage from "../../../components/store/ProductImage";
import { api, errorMessage, money, type CS2Item } from "../../../lib/api";
import styles from "./page.module.css";
export default function CS2ItemPage() {
  const { slug } = useParams<{ slug: string }>(); const [item, setItem] = useState<CS2Item | null>(null); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { api<CS2Item>(`/api/cs2-items/${encodeURIComponent(slug)}`).then(setItem).catch(e => setError(errorMessage(e))).finally(() => setLoading(false)); }, [slug]);
  return <div className={styles.page}><Link href="/cs2-items" className={styles.backLink}>← بازگشت به آیتم‌های CS2</Link>{loading ? <p>در حال بارگذاری…</p> : error ? <p role="alert">{error}</p> : item && <div className={styles.product}>
    <section className={styles.imagePanel}><div className={styles.imageGlow} /><div className={styles.weaponPlaceholder}><ProductImage path={item.image_path} alt={item.name} fallback={item.weapon} /></div></section>
    <section className={styles.info}><div className={styles.statusRow}><span className={styles.category}>CS2 Item</span><span className={item.available ? styles.stockBadge : styles.outOfStockBadge}>{item.available ? `موجودی ${item.stock_quantity}` : "ناموجود"}</span></div><h1 className={styles.title}>{item.name}</h1><p className={styles.description}>{item.description}</p>
      <div className={styles.metaGrid}>{[["Weapon",item.weapon],["Exterior",item.exterior],["Float",item.float_value]].map(([label,value]) => <div className={styles.metaBox} key={label}><div className={styles.metaLabel}>{label}</div><div className={styles.metaValue}>{value}</div></div>)}</div>
      <div className={styles.prices}><div className={styles.priceCard}><p className={styles.priceTitle}>خرید از IRStore24</p><div className={styles.priceMain}>{money(item.sell_price.toman)} تومان</div><div className={styles.priceSecondary}>{money(item.sell_price.usdt)} USDT</div></div><div className={styles.priceCard}><p className={styles.priceTitle}>فروش به IRStore24</p><div className={styles.priceMain}>{money(item.buy_price.toman)} تومان</div><div className={styles.priceSecondary}>{money(item.buy_price.usdt)} USDT</div></div></div>
      <ItemPurchaseActions itemId={item.id} stockQuantity={item.stock_quantity} available={item.available} /><div className={styles.notice}>{(item.sell_price.toman === null || item.sell_price.usdt === null) && <p>نرخ تبدیل هنوز تنظیم نشده است؛ معادل ارزی قیمت در دسترس نیست.</p>}قیمت و موجودی هنگام نهایی‌کردن خرید دوباره بررسی می‌شوند.</div>
    </section></div>}</div>;
}
