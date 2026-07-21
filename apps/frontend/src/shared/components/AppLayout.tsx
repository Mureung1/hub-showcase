import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth, useMe } from "../../features/auth";
import { ROUTES } from "../routes";
import { getSelectedStoreId } from "../utils";

type NavigationItem = {
  label: string;
  path: string;
  match: (pathname: string) => boolean;
};

const ownerNavigationItems: NavigationItem[] = [
  {
    label: "근무표",
    path: ROUTES.schedule,
    match: (pathname) => pathname.startsWith(ROUTES.schedule)
  },
  {
    label: "대타 요청",
    path: ROUTES.substituteRequests,
    match: (pathname) => pathname.startsWith(ROUTES.substituteRequests)
  },
  {
    label: "알바생 관리",
    path: ROUTES.workers,
    match: (pathname) => pathname === ROUTES.workers
  },
  {
    label: "알림",
    path: ROUTES.notifications,
    match: (pathname) => pathname === ROUTES.notifications
  }
];

const workerNavigationItems: NavigationItem[] = [
  {
    label: "근무표",
    path: ROUTES.schedule,
    match: (pathname) => pathname.startsWith(ROUTES.schedule)
  },
  {
    label: "대타 요청",
    path: ROUTES.substituteRequests,
    match: (pathname) => pathname.startsWith(ROUTES.substituteRequests)
  },
  {
    label: "내 근무 정보",
    path: ROUTES.myWork,
    match: (pathname) => pathname === ROUTES.myWork
  },
  {
    label: "알림",
    path: ROUTES.notifications,
    match: (pathname) => pathname === ROUTES.notifications
  }
];

export function AppLayout() {
  const { signOut, user } = useAuth();
  const { data: me } = useMe();
  const location = useLocation();
  const selectedStore = me?.stores.find((store) => store.id === getSelectedStoreId());
  const navigationItems = selectedStore?.role === "OWNER" ? ownerNavigationItems : workerNavigationItems;
  const displayName = me?.profile.name || user?.email?.split("@")[0] || "사용자";

  return (
    <div className="stage">
      <div className="app-shell">
        <header className="topbar">
          <Link className="brand" to={ROUTES.home} aria-label="알바노트 홈">
            <span className="brand-mark">A</span>
            <span>알바노트</span>
          </Link>

          <nav className="topnav" aria-label="주요 메뉴">
            {navigationItems.map((item) => (
              <NavLink
                className={({ isActive }) => (isActive || item.match(location.pathname) ? "active" : undefined)}
                key={item.path}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="top-actions">
            <Link className="store-button" to={ROUTES.storesSelect}>
              {selectedStore?.name ?? "매장 선택"}
            </Link>
            <div className="profile-chip">
              <span>{displayName.slice(0, 1).toUpperCase()}</span>
              <strong>{displayName}</strong>
            </div>
            <button className="text-button logout-button" onClick={() => void signOut()} type="button">
              로그아웃
            </button>
          </div>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
