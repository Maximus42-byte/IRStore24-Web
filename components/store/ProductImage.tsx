"use client";
import { useState } from "react";
export default function ProductImage({ path, alt, fallback }: { path: string | null; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  return path && !failed ? <img src={path} alt={alt} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <>{fallback}</>;
}
