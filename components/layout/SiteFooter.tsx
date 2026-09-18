export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <span className="site-footer__brand">IRStore24</span>

        <span>
          © {new Date().getFullYear()} تمامی حقوق محفوظ است.
        </span>
      </div>
    </footer>
  );
}