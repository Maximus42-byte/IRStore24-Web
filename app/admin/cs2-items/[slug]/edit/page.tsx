"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import CS2ItemForm from "../../../../../components/admin/CS2ItemForm";
import { api, errorMessage, type AdminCS2Item, type Page } from "../../../../../lib/api";
import styles from "../../../admin.module.css";
export default function EditCS2ItemPage() {
  const { slug } = useParams<{ slug: string }>(); const [item, setItem] = useState<AdminCS2Item | null>(null); const [error, setError] = useState("");
  useEffect(() => { async function load() { try { if (/^\d+$/.test(slug)) { setItem(await api<AdminCS2Item>(`/api/admin/cs2-items/${slug}`)); return; } let page = 1; while (true) { const result = await api<Page<AdminCS2Item>>(`/api/admin/cs2-items?page=${page}&page_size=100`); const found = result.items.find(candidate => candidate.slug === slug); if (found) { setItem(found); return; } if (page * 100 >= result.total) { setError("آیتم پیدا نشد."); return; } page++; } } catch (e) { setError(errorMessage(e)); } } load(); }, [slug]);
  return <><header className={styles.pageHeader}><span className={styles.eyebrow}>Admin / CS2 Items / Edit</span><h1 className={styles.pageTitle}>ویرایش {item?.name ?? "آیتم"}</h1></header>{error && <p role="alert">{error}</p>}{item ? <CS2ItemForm key={item.id} mode="edit" item={item} /> : !error && <p>در حال بارگذاری…</p>}</>;
}
