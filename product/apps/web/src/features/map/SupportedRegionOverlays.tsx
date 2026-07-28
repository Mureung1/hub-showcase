import { LocalTwinRegionOverlay } from "./LocalTwinRegionOverlay";
import type { ReadyOverlayRegion } from "./supportedRegions";

type SupportedRegionOverlaysProps = {
  region: ReadyOverlayRegion | undefined;
};

export function SupportedRegionOverlays({ region }: SupportedRegionOverlaysProps) {
  if (!region) return null;
  return <LocalTwinRegionOverlay region={region} />;
}
