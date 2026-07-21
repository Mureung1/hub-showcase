import "maplibre-gl/dist/maplibre-gl.css";

import { useProductCatalog } from "./features/market/useProductCatalog";
import { WorkspaceDialogs } from "./features/workspace/WorkspaceDialogs";
import { WorkspaceHeader } from "./features/workspace/WorkspaceHeader";
import { WorkspaceLayout } from "./features/workspace/WorkspaceLayout";
import { useProductWorkspaceModel } from "./features/workspace/useProductWorkspaceModel";
import { submissionCatalog } from "./services/submissionCatalog";
import "./styles/global.css";

export function App({ useDemoData = false }: { useDemoData?: boolean }) {
  const { catalog, state, retry } = useProductCatalog(useDemoData ? submissionCatalog : undefined);
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
  return <ProductWorkspace catalog={catalog} useDemoData={useDemoData} />;
}

function ProductWorkspace({
  catalog,
  useDemoData,
}: {
  catalog: NonNullable<ReturnType<typeof useProductCatalog>["catalog"]>;
  useDemoData: boolean;
}) {
  const model = useProductWorkspaceModel(catalog, useDemoData);
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
