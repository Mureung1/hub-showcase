import { LocalTwinRegionOverlay } from "./LocalTwinRegionOverlay";
import { READY_OVERLAY_REGIONS } from "./supportedRegions";

type SupportedRegionOverlaysProps = {
  buildingsVisible: boolean;
  hiddenBuildingIds?: string[];
};

export function SupportedRegionOverlays({
  buildingsVisible,
  hiddenBuildingIds = [],
}: SupportedRegionOverlaysProps) {
  return READY_OVERLAY_REGIONS.map((region) => (
    <LocalTwinRegionOverlay
      key={region.id}
      region={region}
      buildingsVisible={buildingsVisible}
      hiddenBuildingIds={hiddenBuildingIds}
    />
  ));
}
