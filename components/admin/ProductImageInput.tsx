"use client";
import { useEffect, useRef, useState } from "react";
import ProductImage from "../store/ProductImage";
import styles from "../../app/admin/admin.module.css";

const MAX_FILE_BYTES = 768 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProductImageInput({
  kind, path, file, onPathChange, onFileChange,
}: {
  kind: "cs2" | "tf2";
  path: string | null;
  file: File | null;
  onPathChange: (path: string | null) => void;
  onFileChange: (file: File | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(candidate: File | null) {
    if (candidate && (!TYPES.has(candidate.type) || candidate.size > MAX_FILE_BYTES)) {
      setError("فقط تصویر JPEG، PNG یا WebP تا حجم ۷۶۸ کیلوبایت مجاز است.");
      onFileChange(null);
      if (input.current) input.current.value = "";
      return;
    }
    setError("");
    onFileChange(candidate);
  }

  function remove() {
    onFileChange(null);
    onPathChange(null);
    if (input.current) input.current.value = "";
    setError("");
  }

  return <div className={`${styles.formField} ${styles.formFieldFull}`}>
    <label htmlFor={`${kind}-image-file`}>تصویر محصول</label>
    <div className={styles.imagePreview}>
      {preview ? <img src={preview} alt="پیش‌نمایش تصویر انتخاب‌شده" /> :
        <ProductImage key={path ?? "empty"} path={path} alt="تصویر فعلی محصول" fallback="بدون تصویر" />}
    </div>
    <div className={styles.imageControls}>
      <input ref={input} id={`${kind}-image-file`} type="file" accept="image/jpeg,image/png,image/webp"
        onChange={event => choose(event.target.files?.[0] ?? null)} />
      {(path || file) && <button type="button" onClick={remove}>حذف تصویر</button>}
    </div>
    <label htmlFor="image_path">مسیر تصویر فعلی یا مسیر رسانه موجود</label>
    <input id="image_path" value={path ?? ""} dir="ltr" placeholder={`/media/${kind}/example.webp`}
      onChange={event => { onFileChange(null); onPathChange(event.target.value || null); }} />
    <small className={styles.imageHelp}>تصویر جدید هنگام ذخیره محصول آپلود می‌شود. جایگزینی یا حذف، فایل قبلی را پاک نمی‌کند.</small>
    {error && <p role="alert">{error}</p>}
  </div>;
}
