"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorMessage, money, query, type CS2Item, type Page } from "../../lib/api";
import ProductImage from "./ProductImage";
import styles from "../../app/cs2-items/page.module.css";

const exteriors = ["Factory New", "Minimal Wear", "Field-Tested", "Well-Worn", "Battle-Scarred"];
export default function CS2Catalog() {
  const [search, setSearch] = useState(""); const [weapon, setWeapon] = useState(""); const [exterior, setExterior] = useState("");
  const [minFloat, setMinFloat] = useState(""); const [maxFloat, setMaxFloat] = useState("");
  const [minPrice, setMinPrice] = useState(""); const [maxPrice, setMaxPrice] = useState("");
  const [available, setAvailable] = useState(false); const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1); const [data, setData] = useState<Page<CS2Item> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      const suffix = query({ search: search.trim(), weapon: weapon.trim(), exterior, min_float: minFloat, max_float: maxFloat, min_price: minPrice, max_price: maxPrice, price_currency: "USDT", available: available ? true : undefined, sort, page, page_size: 12 });
      api<Page<CS2Item>>(`/api/cs2-items${suffix}`, { signal: controller.signal }).then(setData).catch(e => { if (e.name !== "AbortError") setError(errorMessage(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, weapon, exterior, minFloat, maxFloat, minPrice, maxPrice, available, sort, page]);
  function reset() { setSearch(""); setWeapon(""); setExterior(""); setMinFloat(""); setMaxFloat(""); setMinPrice(""); setMaxPrice(""); setAvailable(false); setSort("newest"); setPage(1); }
  const change = (setter: (value: string) => void) => (value: string) => { setter(value); setPage(1); };
  return <div className={styles.catalog}>
    <aside className={styles.filters}><h2 className={styles.filtersTitle}>فیلترها</h2>
      <div className={styles.filterGroup}><label className={styles.filterLabel} htmlFor="search">جستجو</label><input id="search" className={styles.input} type="search" value={search} onChange={e => change(setSearch)(e.target.value)} /></div>
      <div className={styles.filterGroup}><label className={styles.filterLabel} htmlFor="weapon">Weapon</label><input id="weapon" className={styles.input} value={weapon} onChange={e => change(setWeapon)(e.target.value)} /></div>
      <div className={styles.filterGroup}><label className={styles.filterLabel} htmlFor="exterior">Exterior</label><select id="exterior" className={styles.select} value={exterior} onChange={e => change(setExterior)(e.target.value)}><option value="">همه</option>{exteriors.map(value => <option key={value}>{value}</option>)}</select></div>
      <div className={styles.filterGroup}><span className={styles.filterLabel}>Float Range</span><div className={styles.rangeRow}><input className={styles.input} aria-label="Minimum float" type="number" min="0" max="1" step="0.00000001" placeholder="Min" value={minFloat} onChange={e => change(setMinFloat)(e.target.value)} /><input className={styles.input} aria-label="Maximum float" type="number" min="0" max="1" step="0.00000001" placeholder="Max" value={maxFloat} onChange={e => change(setMaxFloat)(e.target.value)} /></div></div>
      <div className={styles.filterGroup}><span className={styles.filterLabel}>Price Range (USDT)</span><div className={styles.rangeRow}><input className={styles.input} aria-label="Minimum price" type="number" min="0" step="0.00000001" placeholder="Min" value={minPrice} onChange={e => change(setMinPrice)(e.target.value)} /><input className={styles.input} aria-label="Maximum price" type="number" min="0" step="0.00000001" placeholder="Max" value={maxPrice} onChange={e => change(setMaxPrice)(e.target.value)} /></div></div>
      <div className={styles.filterGroup}><label className={styles.checkboxRow}><input type="checkbox" checked={available} onChange={e => { setAvailable(e.target.checked); setPage(1); }} /> فقط آیتم‌های موجود</label></div>
      <button type="button" className={styles.resetButton} onClick={reset}>پاک کردن فیلترها</button>
    </aside>
    <div className={styles.main}><div className={styles.toolbar}><span className={styles.resultCount}>{data?.total ?? 0} آیتم</span><select className={`${styles.select} ${styles.sort}`} value={sort} onChange={e => change(setSort)(e.target.value)} aria-label="مرتب‌سازی"><option value="newest">جدیدترین</option><option value="oldest">قدیمی‌ترین</option><option value="name_asc">نام: صعودی</option><option value="name_desc">نام: نزولی</option><option value="price_asc">قیمت: کم به زیاد</option><option value="price_desc">قیمت: زیاد به کم</option><option value="stock_desc">موجودی</option></select></div>
      {loading && <p>در حال بارگذاری…</p>}{error && <p role="alert">{error}</p>}{data?.items.some(item => item.sell_price.toman === null || item.sell_price.usdt === null) && <p>نرخ تبدیل هنوز تنظیم نشده است؛ معادل ارزی بعضی قیمت‌ها در دسترس نیست.</p>}
      {!loading && !error && (data?.items.length ? <div className={styles.grid}>{data.items.map(item => <article key={item.id} className={styles.card}>
        <Link href={`/cs2-items/${item.slug}`} className={styles.image}><ProductImage path={item.image_path} alt={item.name} fallback={item.weapon} /></Link>
        <div className={styles.body}><div className={styles.topRow}><h2 className={styles.name}><Link className={styles.nameLink} href={`/cs2-items/${item.slug}`}>{item.name}</Link></h2><span className={item.available ? styles.stock : styles.outOfStock}>{item.available ? `موجودی ${item.stock_quantity}` : "ناموجود"}</span></div>
          <p className={styles.meta}>{item.exterior}<br />Float: {item.float_value}</p>
          <div className={styles.priceSection}><div className={styles.priceRow}><span className={styles.priceLabel}>خرید از IRStore24</span><span className={styles.priceValue}>{money(item.sell_price.toman)} تومان<br />{money(item.sell_price.usdt)} USDT</span></div><div className={styles.priceRow}><span className={styles.priceLabel}>فروش به IRStore24</span><span className={styles.priceValue}>{money(item.buy_price.toman)} تومان<br />{money(item.buy_price.usdt)} USDT</span></div></div>
          <div className={styles.actions}><Link className={styles.buyButton} href={`/cs2-items/${item.slug}`}>مشاهده و افزودن</Link><Link className={styles.sellButton} href="/support">فروش</Link></div>
        </div></article>)}</div> : <div className={styles.empty}>آیتمی پیدا نشد.</div>)}
      {data && data.total > data.page_size && <div className={styles.toolbar}><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>قبلی</button><span>صفحه {page} از {Math.ceil(data.total / data.page_size)}</span><button type="button" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>بعدی</button></div>}
    </div>
  </div>;
}
