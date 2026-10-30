"use client";
import { useEffect, useState } from "react";
import { safeMediaPath } from "../../lib/api";
export default function ProductImage({ path, alt, fallback }: { path: string | null; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [path]);
  return safeMediaPath(path) && !failed ? <img src={path} alt={alt} onError={() => setFailed(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <>{fallback}</>;
}
