import { AuthButton } from "../features/auth/AuthButton";
import { BrandLogo } from "./BrandLogo";

type SiteHeaderProps = {
  onHome: () => void;
  onOpenWorkspace: () => void;
};

export function SiteHeader({ onHome, onOpenWorkspace }: SiteHeaderProps) {
  return (
    <header className="site-header ptop-container">
      <a
        className="site-brand"
        href="#top"
        aria-label="PtoP 첫 화면으로 이동"
        onClick={(event) => {
          event.preventDefault();
          onHome();
        }}
      >
        <BrandLogo variant="nav" />
      </a>
      <nav className="site-nav" aria-label="주요 메뉴">
        <a
          href="#service"
          onClick={(event) => {
            event.preventDefault();
            onHome();
          }}
        >
          서비스 소개
        </a>
        <a
          href="#workspace"
          onClick={(event) => {
            event.preventDefault();
            onOpenWorkspace();
          }}
        >
          작업실
        </a>
      </nav>
      <AuthButton />
    </header>
  );
}
