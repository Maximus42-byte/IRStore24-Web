"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import TF2KeyForm from "../../../../components/admin/TF2KeyForm";
import { api, errorMessage, type AdminTF2Key } from "../../../../lib/api";
import styles from "../../admin.module.css";
function Editor() { const params = useSearchParams(); const id = params.get("id"); const [item, setItem] = useState<AdminTF2Key | null>(null); const [error, setError] = useState(""); useEffect(() => { if (id) api<AdminTF2Key>(`/api/admin/tf2-keys/${encodeURIComponent(id)}`).then(setItem).catch(e => setError(errorMessage(e))); }, [id]); return <><header className={styles.pageHeader}><span className={styles.eyebrow}>Admin / TF2 Keys</span><h1 className={styles.pageTitle}>{id ? "ویرایش کلید TF2" : "افزودن کلید TF2"}</h1></header>{error && <p role="alert">{error}</p>}{!id || item ? <TF2KeyForm key={item?.id ?? "new"} item={item ?? undefined} /> : !error && <p>در حال بارگذاری…</p>}</>; }
export default function EditTF2KeyPage() { return <Suspense fallback={<p>در حال بارگذاری…</p>}><Editor /></Suspense>; }
