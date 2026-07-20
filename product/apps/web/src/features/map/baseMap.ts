import type { MapMode } from "../market/types";

export const BASE_MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const BASE_BUILDING_LAYER_ID = "localtwin-base-building-3d";

const FALLBACK_ICON_SIZE = 12;

export type MissingStyleImageEvent = {
  id: string;
  target: {
    hasImage: (id: string) => boolean;
    addImage: (
      id: string,
      image: { width: number; height: number; data: Uint8Array },
      options?: { pixelRatio?: number },
    ) => void;
  };
};

export function addMissingStyleImageFallback(event: MissingStyleImageEvent) {
  if (event.target.hasImage(event.id)) return;
  const data = new Uint8Array(FALLBACK_ICON_SIZE * FALLBACK_ICON_SIZE * 4);
  const center = (FALLBACK_ICON_SIZE - 1) / 2;
  for (let y = 0; y < FALLBACK_ICON_SIZE; y += 1) {
    for (let x = 0; x < FALLBACK_ICON_SIZE; x += 1) {
      const offset = (y * FALLBACK_ICON_SIZE + x) * 4;
      const inside = Math.hypot(x - center, y - center) <= 3.5;
      data[offset] = 73;
      data[offset + 1] = 104;
      data[offset + 2] = 83;
      data[offset + 3] = inside ? 190 : 0;
    }
  }
  event.target.addImage(event.id, { width: FALLBACK_ICON_SIZE, height: FALLBACK_ICON_SIZE, data });
}

export function shouldShowBaseBuildings(
  enabled: boolean,
  mapMode: MapMode,
  hasLocalTwinOverlay: boolean,
) {
  if (!enabled) return false;
  return mapMode === "original" || !hasLocalTwinOverlay;
}
