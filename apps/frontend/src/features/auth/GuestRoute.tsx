import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function GuestRoute() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <div className="auth-stage">
        <div className="auth-card">
          <p className="label">SESSION</p>
          <h1>로그인 상태 확인 중</h1>
        </div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/stores/select" replace />;
  }

  return <Outlet />;
}
