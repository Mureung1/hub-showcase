import { useState } from "react";
import { NavLink } from "react-router-dom";
import { subscribeToPush } from "../lib/pushSubscribe";
import "./Navbar.css";

// 홈/할일 등록만 실제 라우트로 연결한다 — 히스토리는 화면 자체가 아직 없어 탭만 두고 비활성 표시.
const NAV_LINKS = [
  { to: "/home", label: "홈" },
  { to: "/register", label: "할일 등록" },
];

// 알림 권한 상태별 버튼 표시 — content-as-data.
// key는 Notification.permission 값("default"/"granted"/"denied") + API 미지원("unsupported").
// clickable=true(=default)일 때만 권한 요청을 다시 띄울 수 있다. 이미 granted/denied면
// 브라우저가 재차 묻지 않으므로 버튼을 비활성화해 둔다.
const PERMISSION_UI = {
  default: { label: "🔔 알림 켜기", clickable: true },
  granted: { label: "🔔 알림 켜짐", clickable: false },
  denied: { label: "🔔 알림 차단됨", clickable: false },
  unsupported: { label: "🔔 알림 미지원", clickable: false },
};

// Notification API를 지원하지 않는 브라우저도 있으므로 초기값을 안전하게 읽는다.
function readPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

function Navbar() {
  // 마운트 시점의 현재 권한 상태를 초기값으로. (lazy initializer로 최초 1회만 읽음)
  const [permission, setPermission] = useState(readPermission);

  async function handleRequestPermission() {
    if (!("Notification" in window)) return;
    // prototype.html의 Notification.requestPermission() 패턴 재사용 — Promise 형태로 받아 상태 반영.
    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      // 구독 생성/전송 실패가 알림 권한 버튼 자체를 깨뜨리지 않도록 방어(#42).
      try {
        await subscribeToPush();
      } catch (err) {
        console.error(err);
      }
    }
  }

  const ui = PERMISSION_UI[permission] ?? PERMISSION_UI.unsupported;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink className="brand" to="/landing">
          <span className="brand-icon" aria-hidden="true">
            🤖
          </span>
          잔소리봇
        </NavLink>
        <div className="nav-links">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} className="nav-link" to={to}>
              {label}
            </NavLink>
          ))}
          {/* 클릭해도 아무 일 없도록 NavLink가 아니라 비활성 span으로 둔다 (히스토리 화면 미구현) */}
          <span className="nav-link nav-link-disabled" aria-disabled="true">
            히스토리
          </span>
        </div>
        <button
          className={
            permission === "granted" ? "nav-perm-btn nav-perm-btn-on" : "nav-perm-btn"
          }
          type="button"
          onClick={handleRequestPermission}
          disabled={!ui.clickable}
        >
          {ui.label}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
