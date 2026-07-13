import { Outlet } from "react-router-dom";

function RoleRoute({ role }) {
  // 로그인 기능이 연결되면 이 경계에서 로그인 여부와 사용자 역할을 검사합니다.
  return <Outlet context={{ requiredRole: role }} />;
}

export default RoleRoute;
