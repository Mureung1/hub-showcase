import type { MarketStore } from "../../market/types";
import type { SelectedStorefront } from "./SelectedStorefrontLayer";
import type { ResolvedStorefrontBuilding } from "./storefrontBuildingPlacement";

export const MAX_VISIBLE_STOREFRONT_OBJECTS = 1;

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
  if (!selected || existingObjectCount >= MAX_VISIBLE_STOREFRONT_OBJECTS) return [];
  const selectedIdentity = storeIdentity(selected);
  const selectedStore = stores.find((store) => storeIdentity(store) === selectedIdentity) ?? selected;
  if (!selectedStore.id || !selectedStore.categoryCode) return [];

  return [
    {
      id: selectedStore.id,
      longitude: selectedStore.longitude,
      latitude: selectedStore.latitude,
      categoryCode: selectedStore.categoryCode,
      placementMode: "selected-focus",
    },
  ];
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
  const candidate = candidates[0];
  if (!candidate) return [];
  const building = placementByStoreId.get(candidate.id);
  if (!building || occupiedBuildingIds.has(building.buildingId)) return [];

  return [
    {
      ...candidate,
      placementMode: "selected-focus",
      building: {
        id: building.buildingId,
        center: building.center,
        plotSizeMeters: building.plotSizeMeters,
        heightMeters: building.heightMeters,
        storeCountInBuilding: building.storeCountInBuilding,
      },
    },
  ];
}
