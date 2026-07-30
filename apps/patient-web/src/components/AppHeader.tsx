import { LogIn, LogOut, Stethoscope } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import { usePatientAuth } from "../auth/PatientAuthContext";

interface AppHeaderProps {
  apiLabel?: string;
  apiState?: "checking" | "connected" | "disconnected";
}

export function AppHeader({ apiLabel, apiState }: AppHeaderProps) {
  const { session, signOut } = usePatientAuth();

  return (
    <header className="topbar">
      <Link className="brand" to="/" aria-label="바로진료 홈">
        <span className="brand-mark" aria-hidden="true">
          <Stethoscope size={20} strokeWidth={2.2} />
        </span>
        바로진료
      </Link>
      <nav className="main-nav" aria-label="주요 메뉴">
        <NavLink to="/">병원 찾기</NavLink>
        <NavLink to="/my-waiting">나의 웨이팅</NavLink>
      </nav>
      <div className="topbar-actions">
        {apiLabel && apiState && (
          <span className={`api-status api-status--${apiState}`}>{apiLabel}</span>
        )}
        {session ? (
          <button className="icon-text-button login-button" type="button" onClick={() => void signOut()}>
            <LogOut size={18} aria-hidden="true" />
            로그아웃
          </button>
        ) : (
          <Link className="icon-text-button login-button" to="/login">
            <LogIn size={18} aria-hidden="true" />
            로그인
          </Link>
        )}
      </div>
    </header>
  );
}
