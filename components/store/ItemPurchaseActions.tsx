"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError, errorMessage, type Cart } from "../../lib/api";
import styles from "../../app/cs2-items/[slug]/page.module.css";
export default function ItemPurchaseActions({ itemId, stockQuantity, available }: { itemId: number; stockQuantity: number; available: boolean }) {
  const [quantity, setQuantity] = useState(1); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const router = useRouter();
  async function add() { setBusy(true); setError(""); try { await api<Cart>("/api/cart/cs2-items", { method: "POST", body: { cs2_item_id: itemId, quantity } }); router.push("/cart"); }
    catch (failure) { if (failure instanceof ApiError && failure.status === 401) router.push(`/login?next=${encodeURIComponent("/cart")}`); else setError(errorMessage(failure)); }
    finally { setBusy(false); } }
  return <div className={styles.purchaseActions}>{available && <div className={styles.quantitySection}><span className={styles.quantityLabel}>تعداد</span><div className={styles.quantityControl}><button className={styles.quantityButton} type="button" disabled={quantity <= 1} onClick={() => setQuantity(quantity - 1)}>−</button><span className={styles.quantityValue}>{quantity}</span><button className={styles.quantityButton} type="button" disabled={quantity >= stockQuantity} onClick={() => setQuantity(quantity + 1)}>+</button></div><span className={styles.quantityHint}>حداکثر {stockQuantity} عدد</span></div>}
    <div className={styles.actionButtons}><button className={styles.addToCartButton} type="button" disabled={!available || busy} onClick={add}>{available ? busy ? "در حال افزودن…" : "افزودن به سبد خرید" : "ناموجود"}</button><Link className={styles.sellButton} href="/support">فروش به IRStore24</Link></div>{error && <p role="alert">{error}</p>}</div>;
}
