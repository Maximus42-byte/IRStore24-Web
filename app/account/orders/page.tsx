"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, dateText, errorMessage, money, query, type Order, type Page } from "../../../lib/api";
import { useSession } from "../../../lib/session";
import styles from "./page.module.css";
export default function OrdersPage() {
  const { user, loading: sessionLoading, error: sessionError } = useSession(); const [data, setData] = useState<Page<Order> | null>(null); const [page, setPage] = useState(1); const [status, setStatus] = useState(""); const [error, setError] = useState("");
  useEffect(() => { if (!user) return; api<Page<Order>>(`/api/account/orders${query({ page, page_size: 12, status })}`).then(setData).catch(e => setError(errorMessage(e))); }, [user, page, status]);
  return <div className={styles.page}><Link href="/account" className={styles.backLink}>← بازگشت به حساب کاربری</Link><header className={styles.header}><span className={styles.eyebrow}>Order History</span><h1 className={styles.title}>سفارش‌های من</h1><p className={styles.description}>وضعیت سفارش‌های فعال و قبلی</p></header>
    <div className={styles.summary}><div className={styles.summaryCard}><div className={styles.summaryLabel}>تعداد نتایج</div><div className={styles.summaryValue}>{data?.total ?? 0}</div></div><div className={styles.summaryCard}><label htmlFor="order-status">وضعیت</label><select id="order-status" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">همه</option><option value="pending">در انتظار</option><option value="confirmed">تأیید شده</option><option value="cancelled">لغو شده</option><option value="expired">منقضی شده</option></select></div></div>
    {(sessionLoading || (user && !data && !error)) && <p>در حال بارگذاری…</p>}{(sessionError || error) && <p role="alert">{sessionError || error}</p>}
    {data?.items.length ? <div className={styles.orders}>{data.items.map(order => <Link key={order.order_number} href={`/account/orders/${order.order_number}`} className={styles.order}><div><div className={styles.orderNumber}>سفارش {order.order_number}</div><div className={styles.orderMeta}>{dateText(order.created_at)}</div></div><div className={styles.right}><span className={`${styles.status} ${styles[order.status]}`}>{order.status}</span><span className={styles.price}>{money(order.total_price_toman)} تومان</span><span className={styles.usdt}>{money(order.total_price_usdt)} USDT</span></div></Link>)}</div> : data && <div className={styles.empty}>هنوز سفارشی ثبت نشده است.</div>}
    {data && data.total > data.page_size && <div><button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>قبلی</button> صفحه {page} <button type="button" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>بعدی</button></div>}
  </div>;
}
