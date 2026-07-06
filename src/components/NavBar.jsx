import { useEffect, useState } from "react";
import { BRAND } from "../config";
import { LeafIcon } from "./Icons";

const LINKS = [
  { href: "#problem", label: "왜 필요한가" },
  { href: "#features", label: "핵심 기능" },
  { href: "#how", label: "작동 방식" },
  { href: "#audience", label: "대상" },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <a className="brand" href="#top" aria-label={`${BRAND.nameKo} 홈`}>
          <span className="brand-logo" aria-hidden="true">
            <LeafIcon size={20} />
          </span>
          <span>
            <span className="brand-name">{BRAND.nameKo}</span>{" "}
            <span className="brand-en">{BRAND.nameEn}</span>
          </span>
        </a>

        <nav className="nav-links" aria-label="섹션 바로가기">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
          <a className="btn btn-primary nav-cta" href="#features">
            기능 살펴보기
          </a>
        </nav>
      </div>
    </header>
  );
}
