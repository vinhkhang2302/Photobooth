import { useState } from "react";

const NAV_LINKS = [
  { label: "Trang chủ", href: "#top" },
  { label: "Khám phá studio", href: "#studios" },
  { label: "Cách hoạt động", href: "#how-it-works" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header" id="top">
      <div className="container header-inner">
        <a className="brand" href="#top" aria-label="Photobooth — Trang chủ">
          <span className="brand-mark" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="2" y="6" width="24" height="17" rx="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="14" cy="14.5" r="5" stroke="currentColor" strokeWidth="2" />
              <circle cx="22" cy="9" r="1.6" fill="currentColor" />
            </svg>
          </span>
          <span className="brand-name">
            Photo<span className="brand-accent">booth</span>
          </span>
        </a>

        <button
          type="button"
          className={`nav-toggle ${menuOpen ? "is-open" : ""}`}
          aria-expanded={menuOpen}
          aria-label="Mở/đóng menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Điều hướng chính">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
              {link.label}
            </a>
          ))}
          <a className="btn btn-primary" href="#studios" onClick={() => setMenuOpen(false)}>
            Đăng nhập
          </a>
        </nav>
      </div>
    </header>
  );
}
