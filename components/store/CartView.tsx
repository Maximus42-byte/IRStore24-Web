"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, errorMessage, money, type Cart, type OrderDetail, type Price } from "../../lib/api";
import { useSession } from "../../lib/session";
import styles from "../../app/cart/page.module.css";
type Entry = { kind: "cs2-items" | "tf2-keys"; id: number; name: string; href: string; quantity: number; stock: number; purchasable: boolean; price: Price };
export default function CartView() {
  const { user, loading: sessionLoading, error: sessionError } = useSession();
  const [cart, setCart] = useState<Cart | null>(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false); const router = useRouter();
  useEffect(() => { if (user) api<Cart>("/api/cart").then(setCart).catch(e => setError(errorMessage(e))); }, [user]);
  const entries: Entry[] = cart ? [...cart.cs2_items.map(line => ({ kind: "cs2-items" as const, id: line.product.id, name: line.product.name, href: `/cs2-items/${line.product.slug}`, quantity: line.quantity, stock: line.product.stock_quantity, purchasable: line.purchasable, price: line.product.sell_price })), ...cart.tf2_keys.map(line => ({ kind: "tf2-keys" as const, id: line.product.id, name: "کلید TF2", href: "/tf2-keys", quantity: line.quantity, stock: line.product.stock_quantity, purchasable: line.purchasable, price: line.product.sell_price }))] : [];
  async function change(entry: Entry, quantity: number | null) {
    setBusy(true); setError(""); try { const path = `/api/cart/${entry.kind}/${entry.id}` as `/api/${string}`; if (quantity === null) { await api<void>(path, { method: "DELETE" }); setCart(await api<Cart>("/api/cart")); } else setCart(await api<Cart>(path, { method: "PATCH", body: { quantity } })); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function finalize() { setBusy(true); setError(""); try { const order = await api<OrderDetail>("/api/orders/finalize", { method: "POST" }); router.push(`/account/orders/${order.order_number}`); }
    catch (failure) { if (failure instanceof ApiError && failure.status === 401) router.push("/login?next=%2Fcart"); else { setError(errorMessage(failure)); setCart(await api<Cart>("/api/cart").catch(() => cart)); } } finally { setBusy(false); } }
  if (sessionLoading || (user && !cart && !error)) return <p>در حال بارگذاری سبد خرید…</p>;
  if (sessionError || error) return <p role="alert">{sessionError || error}</p>;
  if (!user) return <p>برای مشاهده سبد خرید وارد شوید.</p>;
  if (entries.length === 0) return <div className={styles.empty}><div className={styles.emptyIcon}>0</div><h2 className={styles.emptyTitle}>سبد خرید خالی است</h2><p className={styles.emptyDescription}>هنوز آیتمی اضافه نکرده‌اید.</p><Link href="/cs2-items" className={styles.shopButton}>مشاهده آیتم‌های CS2</Link></div>;
  return <div className={styles.layout}><section className={styles.items}>{entries.map(entry => <article key={`${entry.kind}-${entry.id}`} className={styles.item}>
    <Link href={entry.href} className={styles.itemVisual}>{entry.kind === "cs2-items" ? "CS2" : "KEY"}</Link><div className={styles.itemInfo}><div className={styles.itemTop}><div><Link href={entry.href} className={styles.itemName}>{entry.name}</Link><p className={styles.itemMeta}>{entry.purchasable ? "قابل خرید" : "در حال حاضر قابل خرید نیست"}</p></div><button className={styles.removeButton} type="button" disabled={busy} onClick={() => change(entry, null)}>حذف</button></div>
      <div className={styles.itemBottom}><div className={styles.price}><span className={styles.priceMain}>{money(entry.price.toman)} تومان</span><span className={styles.priceSecondary}>{money(entry.price.usdt)} USDT</span></div><div className={styles.quantityControl}><button className={styles.quantityButton} type="button" disabled={busy || entry.quantity <= 1} onClick={() => change(entry, entry.quantity - 1)}>−</button><span className={styles.quantity}>{entry.quantity}</span><button className={styles.quantityButton} type="button" disabled={busy || entry.quantity >= entry.stock} onClick={() => change(entry, entry.quantity + 1)}>+</button></div></div><div className={styles.stockHint}>موجودی فعلی: {entry.stock}</div></div></article>)}</section>
    <aside className={styles.summary}><h2 className={styles.summaryTitle}>خلاصه سبد خرید</h2><div className={styles.summaryRow}><span>تعداد کل</span><strong>{entries.reduce((total, entry) => total + entry.quantity, 0)}</strong></div><div className={styles.divider} /><div className={styles.totalBlock}><span className={styles.totalLabel}>مجموع تومان</span><strong className={styles.totalValue}>{money(cart?.total_price_toman)} تومان</strong></div><div className={styles.totalBlock}><span className={styles.totalLabel}>مجموع USDT</span><strong className={styles.totalUsdt}>{money(cart?.total_price_usdt)} USDT</strong></div>
      {!cart?.exchange_rate_configured && <p className={styles.notice}>نرخ تبدیل هنوز تنظیم نشده است؛ مبلغ معادل و خرید در دسترس نیست.</p>}
      <button className={styles.buyButton} type="button" disabled={busy || !cart?.exchange_rate_configured || entries.some(entry => !entry.purchasable)} onClick={finalize}>{busy ? "در حال پردازش…" : "خرید"}</button><p className={styles.notice}>مبلغ نهایی، نرخ ارز و موجودی هنگام ثبت سفارش توسط سرور محاسبه می‌شوند.</p>
    </aside></div>;
}
