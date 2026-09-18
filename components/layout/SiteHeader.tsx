import Link from "next/link";

export default function SiteHeader() {
  return (
    <header>
      <Link href="/" aria-label="IRStore24 Home">
        IRStore24
      </Link>

      <nav aria-label="Main navigation">
        <Link href="/">خانه</Link>
        <Link href="/cs2-items">آیتم CS2</Link>
        <Link href="/tf2-keys">کلید TF2</Link>
        <Link href="/support">پشتیبانی</Link>
      </nav>

      <div>
        <Link href="/login">ورود</Link>
        <Link href="/cart">سبد خرید</Link>
      </div>
    </header>
  );
}
