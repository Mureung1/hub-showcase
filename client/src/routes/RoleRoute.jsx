import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUserRole } from "../utils/authStorage";
import { routePaths } from "./routePaths";

function RoleRoute({ role }) {
  const location = useLocation();
  const currentUserRole = getCurrentUserRole();

  if (!currentUserRole) {
    return <Navigate to={routePaths.landingLogin} replace state={{ from: location.pathname }} />;
  }

  if (currentUserRole !== role) {
    return <Navigate to={routePaths.forbidden} replace />;
  }

  return <Outlet context={{ requiredRole: role }} />;
}

export default RoleRoute;
