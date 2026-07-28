import { LocalTwinRegionOverlay } from "./LocalTwinRegionOverlay";
import type { MarketBoundaryGeometry } from "./marketBoundaryGeometry";
import type { ReadyOverlayRegion } from "./supportedRegions";

type SupportedRegionOverlaysProps = {
  region: ReadyOverlayRegion | undefined;
  buildingsVisible: boolean;
  buildingAppearance: "analysis" | "storefront3d";
  marketBoundaryGeometry: MarketBoundaryGeometry | null;
  hiddenBuildingIds?: string[];
};

export function SupportedRegionOverlays({
  region,
  buildingsVisible,
  buildingAppearance,
  marketBoundaryGeometry,
  hiddenBuildingIds = [],
}: SupportedRegionOverlaysProps) {
  if (!region) return null;
  return (
    <LocalTwinRegionOverlay
      region={region}
      buildingsVisible={buildingsVisible}
      buildingAppearance={buildingAppearance}
      marketBoundaryGeometry={marketBoundaryGeometry}
      hiddenBuildingIds={hiddenBuildingIds}
    />
  );
}
