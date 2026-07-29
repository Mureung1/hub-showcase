import "maplibre-gl/dist/maplibre-gl.css";

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

export function App({ useDemoData = false }: { useDemoData?: boolean }) {
  const apiReadiness = useApiReadiness(!useDemoData);
  const { catalog, state, remoteState, retry } = useProductCatalog(
    PRODUCT_CATALOG_BOOTSTRAP,
    useDemoData || apiReadiness.state === "ready",
  );
  const panelTextSize = usePanelTextSize();
  const model = useProductWorkspaceModel({
    catalog,
    catalogState: state,
    apiReadiness,
    useDemoData,
  });
  const catalogDisplayState =
    remoteState === "ready"
      ? "ranked"
      : remoteState === "loading" || remoteState === "idle"
        ? "connecting"
        : remoteState === "error"
          ? "error"
          : "bootstrap";

  return (
    <div className="app-shell">
      <WorkspaceHeader
        model={model}
        panelTextSize={panelTextSize.value}
        onPanelTextSizeChange={panelTextSize.setValue}
      />
      <WorkspaceLayout
        model={model}
        catalogDisplayState={catalogDisplayState}
        onCatalogRetry={retry}
        panelTextSize={panelTextSize.value}
      />
      <WorkspaceDialogs model={model} />
    </div>
  );
}

export default App;
