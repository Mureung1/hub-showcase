import "maplibre-gl/dist/maplibre-gl.css";

import { lazy, Suspense, useState } from "react";

import { useProductCatalog } from "./features/market/useProductCatalog";
import { useApiReadiness } from "./features/system/useApiReadiness";
import { WorkspaceDialogs } from "./features/workspace/WorkspaceDialogs";
import { WorkspaceHeader } from "./features/workspace/WorkspaceHeader";
import { WorkspaceLayout } from "./features/workspace/WorkspaceLayout";
import { usePanelTextSize } from "./features/workspace/usePanelTextSize";
import { useProductWorkspaceModel } from "./features/workspace/useProductWorkspaceModel";
import { PRODUCT_CATALOG_BOOTSTRAP } from "./services/productCatalog";
import "./styles/global.css";
import "./styles/suitFont.css";
import "./styles/mapOverlays.css";
import "./styles/panelAccessibility.css";
import "./styles/categorySemantics.css";

const SceneWorkspace = lazy(() =>
  import("./components/SceneWorkspace").then(({ SceneWorkspace: Component }) => ({
    default: Component,
  })),
);

export function App({ useDemoData = false }: { useDemoData?: boolean }) {
  const apiReadiness = useApiReadiness(!useDemoData);
  const { catalog, state, remoteState, retry } = useProductCatalog(
    PRODUCT_CATALOG_BOOTSTRAP,
    useDemoData || apiReadiness.state === "ready",
  );
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
    <ProductWorkspace
      catalog={catalog}
      useDemoData={useDemoData}
      apiReadiness={apiReadiness}
      catalogState={
        catalog.ranking_basis === "supported_market_unique_store_count"
          ? "ranked"
          : remoteState === "error"
            ? "error"
            : apiReadiness.state === "ready" && remoteState === "ready"
              ? "bootstrap"
              : "connecting"
      }
      onCatalogRetry={() => {
        apiReadiness.retry();
        retry();
      }}
    />
  );
}

function ProductWorkspace({
  catalog,
  useDemoData,
  apiReadiness,
  catalogState,
  onCatalogRetry,
}: {
  catalog: NonNullable<ReturnType<typeof useProductCatalog>["catalog"]>;
  useDemoData: boolean;
  apiReadiness: ReturnType<typeof useApiReadiness>;
  catalogState: "ranked" | "connecting" | "bootstrap" | "error";
  onCatalogRetry: () => void;
}) {
  const model = useProductWorkspaceModel(catalog, useDemoData, apiReadiness);
  const panelText = usePanelTextSize();
  const [sceneExperimentOpen, setSceneExperimentOpen] = useState(false);
  const storefrontState = model.viewport.storefront3dUnavailable
    ? "fallback"
    : model.storefronts.selectedStorefront3d
      ? "selected"
      : "idle";

  return (
    <main className="app-shell" data-storefront-3d-state={storefrontState}>
      <WorkspaceHeader
        model={model}
        panelTextSize={panelText.size}
        onPanelTextSizeChange={panelText.setSize}
        onSceneExperimentOpen={() => setSceneExperimentOpen(true)}
      />
      <WorkspaceLayout
        model={model}
        catalogDisplayState={catalogState}
        onCatalogRetry={onCatalogRetry}
        panelTextSize={panelText.size}
      />
      <WorkspaceDialogs model={model} />
      {sceneExperimentOpen && (
        <Suspense fallback={<div className="scene-loading">3DGS 실험실을 준비하는 중입니다.</div>}>
          <SceneWorkspace
            onClose={() => setSceneExperimentOpen(false)}
            restoreFocusExternally={false}
          />
        </Suspense>
      )}
    </main>
  );
}

export default App;
