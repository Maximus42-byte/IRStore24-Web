"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, ApiError, type User } from "./api";

export function useSession(admin = false) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let active = true;
    api<User>("/api/auth/me").then((found) => {
      if (!active) return;
      if (admin && found.role !== "admin") { router.replace("/account"); return; }
      setUser(found);
    }).catch((failure) => {
      if (!active) return;
      if (failure instanceof ApiError && failure.status === 401) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      else setError(failure instanceof Error ? failure.message : "خطا در دریافت نشست");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [admin, pathname, router]);
  return { user, loading, error };
}
