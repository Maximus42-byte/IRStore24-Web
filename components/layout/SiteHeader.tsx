import Link from "next/link";

export default function SiteHeader() {
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
          <Link href="/login" className="header-action">
            ورود
          </Link>

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