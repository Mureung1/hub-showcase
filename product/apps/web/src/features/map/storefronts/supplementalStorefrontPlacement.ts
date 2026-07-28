import type { MarketStore } from "../../market/types";
import type { SelectedStorefront } from "./SelectedStorefrontLayer";
import type { ResolvedStorefrontBuilding } from "./storefrontBuildingPlacement";

export const MAX_VISIBLE_STOREFRONT_OBJECTS = 12;

function storeIdentity(store: MarketStore) {
  return store.id ?? `${store.name}:${store.longitude}:${store.latitude}`;
}

export function selectSupplementalStorefrontCandidates({
  stores,
  existingObjectCount,
  selected,
}: {
  stores: MarketStore[];
  existingObjectCount: number;
  selected: MarketStore | null;
}): SelectedStorefront[] {
  const remaining = Math.max(0, MAX_VISIBLE_STOREFRONT_OBJECTS - existingObjectCount);
  if (remaining === 0) return [];

  const selectedIdentity = selected ? storeIdentity(selected) : null;
  const prioritized = [...stores].sort((left, right) => {
    const leftSelected = storeIdentity(left) === selectedIdentity ? 1 : 0;
    const rightSelected = storeIdentity(right) === selectedIdentity ? 1 : 0;
    return rightSelected - leftSelected;
  });
  const seen = new Set<string>();
  const candidates: SelectedStorefront[] = [];

  for (const store of prioritized) {
    if (!store.id || !store.categoryCode || seen.has(store.id)) continue;
    seen.add(store.id);
    candidates.push({
      id: store.id,
      longitude: store.longitude,
      latitude: store.latitude,
      categoryCode: store.categoryCode,
    });
    if (candidates.length >= remaining) break;
  }
  return candidates;
}

export function buildSupplementalStorefronts({
  candidates,
  placements,
  occupiedBuildingIds,
}: {
  candidates: SelectedStorefront[];
  placements: ResolvedStorefrontBuilding[];
  occupiedBuildingIds: ReadonlySet<string>;
}): SelectedStorefront[] {
  const placementByStoreId = new Map(
    placements.map((placement) => [placement.storeId, placement.building]),
  );
  const claimedBuildings = new Set(occupiedBuildingIds);
  const supplemental: SelectedStorefront[] = [];

  for (const candidate of candidates) {
    const building = placementByStoreId.get(candidate.id);
    if (!building || claimedBuildings.has(building.buildingId)) continue;
    claimedBuildings.add(building.buildingId);
    supplemental.push({
      ...candidate,
      placementMode:
        building.storeCountInBuilding <= 1 ? "replace-building" : "rooftop-marker",
      building: {
        id: building.buildingId,
        center: building.center,
        plotSizeMeters: building.plotSizeMeters,
        heightMeters: building.heightMeters,
        storeCountInBuilding: building.storeCountInBuilding,
      },
    });
  }
  return supplemental;
}
