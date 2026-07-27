import "maplibre-gl/dist/maplibre-gl.css";

import { useProductCatalog } from "./features/market/useProductCatalog";
import { useApiReadiness } from "./features/system/useApiReadiness";
import { WorkspaceDialogs } from "./features/workspace/WorkspaceDialogs";
import { WorkspaceHeader } from "./features/workspace/WorkspaceHeader";
import { WorkspaceLayout } from "./features/workspace/WorkspaceLayout";
import { useProductWorkspaceModel } from "./features/workspace/useProductWorkspaceModel";
import { PRODUCT_CATALOG_BOOTSTRAP } from "./services/productCatalog";
import "./styles/global.css";
import "./styles/mapOverlays.css";

export function App({ useDemoData = false }: { useDemoData?: boolean }) {
  const apiReadiness = useApiReadiness(!useDemoData);
  const { catalog, state, retry } = useProductCatalog(PRODUCT_CATALOG_BOOTSTRAP, !useDemoData);
  if (state === "loading")
    return <main className="app-bootstrap">지원 범위를 불러오는 중입니다.</main>;
  if (!catalog || catalog.markets.length === 0) {
    return (
      <main className="app-bootstrap" role="alert">
        <p>지원 범위를 불러오지 못했습니다.</p>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
      </main>
    );
  }
  return (
    <ProductWorkspace catalog={catalog} useDemoData={useDemoData} apiReadiness={apiReadiness} />
  );
}

function ProductWorkspace({
  catalog,
  useDemoData,
  apiReadiness,
}: {
  catalog: NonNullable<ReturnType<typeof useProductCatalog>["catalog"]>;
  useDemoData: boolean;
  apiReadiness: ReturnType<typeof useApiReadiness>;
}) {
  const model = useProductWorkspaceModel(catalog, useDemoData, apiReadiness);
  const storefrontState = model.viewport.storefront3dUnavailable
    ? "fallback"
    : model.storefronts.selectedStorefront3d
      ? "selected"
      : "idle";

  return (
    <main className="app-shell" data-storefront-3d-state={storefrontState}>
      <WorkspaceHeader model={model} />
      <WorkspaceLayout model={model} />
      <WorkspaceDialogs model={model} />
    </main>
  );
}

export default App;
