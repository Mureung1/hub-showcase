import { Navigate } from "react-router-dom";
import { ROUTES } from "../../shared/routes";
import { getSelectedStoreId } from "../../shared/utils";
import { useAuth } from "./AuthProvider";

export function HomeRedirect() {
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

  if (!session) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Navigate to={getSelectedStoreId() ? ROUTES.schedule : ROUTES.storesSelect} replace />;
}
