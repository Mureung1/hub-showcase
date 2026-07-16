import type { CustomLayerInterface } from "maplibre-gl";

import { createStorefrontMapLayer } from "./createStorefrontMapLayer";
import { flowerStorefrontLocation } from "./flowerStorefrontLocation";

const layerId = "localtwin-flower-storefront";

export function createFlowerStorefrontLayer(): CustomLayerInterface {
  return createStorefrontMapLayer({
    id: layerId,
    longitude: flowerStorefrontLocation.longitude,
    latitude: flowerStorefrontLocation.latitude,
    categoryCode: flowerStorefrontLocation.visualCategoryCode,
    source: flowerStorefrontLocation.source,
    sourceId: flowerStorefrontLocation.sourceId,
  });
}

export const flowerStorefrontLayerId = layerId;
