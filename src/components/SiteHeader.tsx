import type { AuthSession } from "../services/auth";
import type { Navigate } from "../hooks/useRoute";

type SiteHeaderProps = {
  session: AuthSession | null;
  pathname: string;
  navigate: Navigate;
  signingOut: boolean;
  onSignOut: () => void;
};

function SiteHeader({ session, pathname, navigate, signingOut, onSignOut }: SiteHeaderProps) {
  const go = (path: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    navigate(path);
  };

  return (
    <header className="site-header">
      <a className="brand" href="/" onClick={go("/")} aria-label="Modu Brain 홈">
        <span className="brand-mark" aria-hidden="true">M</span>
        <span>Modu Brain</span>
      </a>
      <nav aria-label="주요 메뉴">
        <a
          aria-current={pathname === "/" ? "page" : undefined}
          className={pathname === "/" ? "active" : ""}
          href="/"
          onClick={go("/")}
        >
          소개
        </a>
        {session ? (
          <>
            <a
              aria-current={pathname.startsWith("/projects") ? "page" : undefined}
              className={pathname.startsWith("/projects") ? "active" : ""}
              href="/projects"
              onClick={go("/projects")}
            >
              프로젝트
            </a>
            <button className="nav-action" type="button" disabled={signingOut} onClick={onSignOut}>
              {signingOut ? "로그아웃 중…" : "로그아웃"}
            </button>
          </>
        ) : (
          <a
            aria-current={pathname === "/login" ? "page" : undefined}
            className={pathname === "/login" ? "active" : ""}
            href="/login"
            onClick={go("/login")}
          >
            로그인
          </a>
        )}
      </nav>
    </header>
  );
}

export default SiteHeader;
