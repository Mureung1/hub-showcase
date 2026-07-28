import type { FilterSpecification } from "maplibre-gl";

import { findReadyOverlayRegion } from "../supportedRegions";
import type { SelectedStorefront } from "./SelectedStorefrontLayer";
import {
  findBuildingFootprintById,
  loadOverlayBuildings,
  type StorefrontBuildingFootprint,
} from "./storefrontBuildingPlacement";

function multiPolygonCoordinates(footprints: StorefrontBuildingFootprint[]) {
  return footprints.flatMap((footprint) =>
    footprint.type === "Polygon" ? [footprint.coordinates] : footprint.coordinates,
  );
}

export function replacementFootprintsFilter(
  footprints: StorefrontBuildingFootprint[],
): FilterSpecification | undefined {
  const coordinates = multiPolygonCoordinates(footprints);
  if (coordinates.length === 0) return undefined;
  return [
    "!",
    [
      "within",
      {
        type: "MultiPolygon",
        coordinates,
      },
    ],
  ] as FilterSpecification;
}

export async function loadReplacementBuildingFilter(
  stores: SelectedStorefront[],
): Promise<FilterSpecification | undefined> {
  const storesByOverlay = new Map<string, SelectedStorefront[]>();
  for (const store of stores) {
    if (!store.building) continue;
    const region = findReadyOverlayRegion([store.longitude, store.latitude]);
    if (!region) continue;
    const grouped = storesByOverlay.get(region.overlayDataUrl) ?? [];
    grouped.push(store);
    storesByOverlay.set(region.overlayDataUrl, grouped);
  }

  const groups = await Promise.all(
    [...storesByOverlay.entries()].map(async ([overlayDataUrl, groupedStores]) => {
      const overlay = await loadOverlayBuildings(overlayDataUrl);
      return groupedStores.flatMap((store) => {
        const footprint = store.building
          ? findBuildingFootprintById(overlay, store.building.id)
          : null;
        return footprint ? [footprint] : [];
      });
    }),
  );

  return replacementFootprintsFilter(groups.flat());
}
