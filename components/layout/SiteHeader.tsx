"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type User } from "../../lib/api";

export default function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { api<User>("/api/auth/me").then(found => { if (active) setUser(found); }).catch(() => { if (active) setUser(null); }); };
    refresh(); window.addEventListener("auth:changed", refresh);
    return () => { active = false; window.removeEventListener("auth:changed", refresh); };
  }, []);
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-logo" aria-label="IRStore24 Home">
          IRStore<span className="site-logo__accent">24</span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/" className="site-nav__link">
            خانه
          </Link>

          <Link href="/cs2-items" className="site-nav__link">
            آیتم CS2
          </Link>

          <Link href="/tf2-keys" className="site-nav__link">
            کلید TF2
          </Link>

          <Link href="/support" className="site-nav__link">
            پشتیبانی
          </Link>
        </nav>

        <div className="site-header__actions">
          <Link href={user ? "/account" : "/login"} className="header-action">
            {user ? "حساب من" : "ورود"}
          </Link>
          {user?.role === "admin" && <Link href="/admin" className="header-action">مدیریت</Link>}

          <Link
            href="/cart"
            className="header-action header-action--cart"
            aria-label="Shopping cart"
          >
            سبد خرید
          </Link>
        </div>
      </div>
    </header>
  );
}
