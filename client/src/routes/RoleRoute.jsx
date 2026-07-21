import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { routePaths } from "./routePaths";

function RoleRoute({ role }) {
  const location = useLocation();
  const { currentUser } = useAuth();
  const currentUserRole = currentUser?.role;

  if (!currentUserRole) {
    return <Navigate to={routePaths.landingLogin} replace state={{ from: location.pathname }} />;
  }

  if (currentUserRole !== role) {
    return <Navigate to={routePaths.forbidden} replace />;
  }

  return <Outlet context={{ requiredRole: role }} />;
}

export default RoleRoute;
