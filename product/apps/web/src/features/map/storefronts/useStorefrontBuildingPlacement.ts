import { useEffect, useState } from "react";

import { findReadyOverlayRegion } from "../supportedRegions";
import {
  countStoresInBuilding,
  findStorefrontBuilding,
  loadOverlayBuildings,
  type StorefrontBuildingPlacement,
  type ResolvedStorefrontBuilding,
  type StorefrontBuildingCandidate,
  type StorefrontCoordinate,
} from "./storefrontBuildingPlacement";

export function useStorefrontBuildingPlacement(
  store: StorefrontCoordinate | null,
  nearbyStores: StorefrontCoordinate[],
) {
  const [placement, setPlacement] = useState<StorefrontBuildingPlacement | null>(null);

  useEffect(() => {
    if (!store || typeof fetch === "undefined") {
      setPlacement(null);
      return;
    }
    const region = findReadyOverlayRegion([store.longitude, store.latitude]);
    if (!region) {
      setPlacement(null);
      return;
    }
    let active = true;
    setPlacement(null);
    loadOverlayBuildings(region.overlayDataUrl)
      .then((overlay) => {
        if (!active) return;
        const building = findStorefrontBuilding(overlay, [store.longitude, store.latitude]);
        setPlacement(
          building
            ? {
                ...building,
                storeCountInBuilding: countStoresInBuilding(overlay, building.buildingId, nearbyStores),
              }
            : null,
        );
      })
      .catch(() => {
        if (active) setPlacement(null);
      });
    return () => {
      active = false;
    };
  }, [nearbyStores, store]);

  return placement;
}

export function useStorefrontBuildingPlacements(
  stores: StorefrontBuildingCandidate[],
  nearbyStores: StorefrontCoordinate[],
) {
  const [placements, setPlacements] = useState<ResolvedStorefrontBuilding[]>([]);
  const storeKey = stores
    .map((store) => `${store.id}:${store.longitude.toFixed(6)}:${store.latitude.toFixed(6)}`)
    .join("|");
  const nearbyStoreKey = nearbyStores
    .map((store) => `${store.id ?? store.longitude}:${store.longitude.toFixed(6)}:${store.latitude.toFixed(6)}`)
    .join("|");

  useEffect(() => {
    if (stores.length === 0 || typeof fetch === "undefined") {
      setPlacements([]);
      return;
    }
    let active = true;
    setPlacements([]);
    const candidatesByOverlay = new Map<string, StorefrontBuildingCandidate[]>();
    for (const store of stores) {
      const region = findReadyOverlayRegion([store.longitude, store.latitude]);
      if (!region) continue;
      const grouped = candidatesByOverlay.get(region.overlayDataUrl) ?? [];
      grouped.push(store);
      candidatesByOverlay.set(region.overlayDataUrl, grouped);
    }

    void Promise.all(
      [...candidatesByOverlay.entries()].map(async ([overlayUrl, candidates]) => {
        const overlay = await loadOverlayBuildings(overlayUrl);
        return candidates.flatMap((store) => {
          const building = findStorefrontBuilding(overlay, [store.longitude, store.latitude]);
          if (!building) return [];
          const storeCountInBuilding = countStoresInBuilding(
            overlay,
            building.buildingId,
            nearbyStores,
          );
          return [{ storeId: store.id, building: { ...building, storeCountInBuilding } }];
        });
      }),
    )
      .then((groups) => {
        if (active) setPlacements(groups.flat());
      })
      .catch(() => {
        if (active) setPlacements([]);
      });

    return () => {
      active = false;
    };
  }, [nearbyStoreKey, nearbyStores, storeKey, stores]);

  return placements;
}
