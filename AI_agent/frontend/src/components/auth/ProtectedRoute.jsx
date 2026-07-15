import { Navigate } from "react-router-dom";

import { isAuthenticated } from "../../features/auth/authService";
import { routes } from "../../router";

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to={routes.login} replace />;
  }

  return children;
}

export default ProtectedRoute;
