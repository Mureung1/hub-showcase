import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "../../shared/routes";
import { clearSelectedStoreId, getSelectedStoreId, setSelectedStoreId } from "../../shared/utils";
import { useMe } from "./useMe";

export function RequireSelectedStore() {
  const { data: me, error, isLoading } = useMe();

  if (isLoading) {
    return (
      <div className="auth-stage">
        <div className="auth-card">
          <p className="label">STORE</p>
          <h1>매장 정보를 확인 중</h1>
        </div>
      </div>
    );
  }

  if (error || !me) {
    return <Navigate to={ROUTES.storesSelect} replace />;
  }

  const selectedStoreId = getSelectedStoreId();
  const hasSelectedStore = me.stores.some((store) => store.id === selectedStoreId);

  if (selectedStoreId && !hasSelectedStore) {
    clearSelectedStoreId();
    return <Navigate to={ROUTES.storesSelect} replace />;
  }

  if (!selectedStoreId) {
    if (me.stores.length === 1) {
      setSelectedStoreId(me.stores[0].id);
    } else {
      return <Navigate to={ROUTES.storesSelect} replace />;
    }
  }

  return <Outlet />;
}
