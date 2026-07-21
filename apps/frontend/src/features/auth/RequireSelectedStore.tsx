import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../../shared/routes";
import { getSelectedStoreId } from "../../shared/utils";

export function RequireSelectedStore() {
  if (!getSelectedStoreId()) {
    return <Navigate to={ROUTES.storesSelect} replace />;
  }

  return <Outlet />;
}
