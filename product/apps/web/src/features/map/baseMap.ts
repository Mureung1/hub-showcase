import type { MapMode } from "../market/types";

export const BASE_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const BASE_BUILDING_LAYER_ID = "localtwin-base-building-3d";

export function shouldShowBaseBuildings(
  enabled: boolean,
  mapMode: MapMode,
  hasLocalTwinOverlay: boolean,
) {
  if (!enabled) return false;
  return mapMode === "original" || !hasLocalTwinOverlay;
}
