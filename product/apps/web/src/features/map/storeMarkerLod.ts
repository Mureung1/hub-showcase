import type { MarketStore } from "../market/types";

export const STORE_MARKER_DETAIL_ZOOM = 16.2;

export type StoreMarkerGroupingMode = "analysis" | "storefront3d";

export type StoreMarkerGroup = {
  store: MarketStore;
  count: number;
};

function markerCellMeters(zoom: number, mode: StoreMarkerGroupingMode) {
  const base = zoom < 14.8 ? 180 : zoom < 15.6 ? 95 : 52;
  return mode === "storefront3d" ? base * 1.55 : base;
}

function storeIdentity(store: MarketStore) {
  return store.id ?? `${store.name}:${store.longitude}:${store.latitude}`;
}

export function isStoreMarkerDeemphasized(
  store: MarketStore,
  selectedName: string | null,
  mode: StoreMarkerGroupingMode,
) {
  return mode === "storefront3d" && selectedName !== null && selectedName !== store.name;
}

export function groupStoreMarkers(
  stores: MarketStore[],
  zoom: number,
  selectedName: string | null,
  mode: StoreMarkerGroupingMode = "analysis",
): StoreMarkerGroup[] {
  if (zoom >= STORE_MARKER_DETAIL_ZOOM) {
    return stores.map((store) => ({ store, count: 1 }));
  }

  const cellMeters = markerCellMeters(zoom, mode);
  const groups = new Map<string, StoreMarkerGroup>();
  for (const store of stores) {
    const isSelected = selectedName === store.name;
    const metersPerLatitude = 111_320;
    const metersPerLongitude =
      metersPerLatitude * Math.cos((store.latitude * Math.PI) / 180);
    const key = isSelected
      ? `selected:${storeIdentity(store)}`
      : `${Math.floor((store.longitude * metersPerLongitude) / cellMeters)}:${Math.floor(
          (store.latitude * metersPerLatitude) / cellMeters,
        )}`;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
    } else {
      groups.set(key, { store, count: 1 });
    }
  }
  return [...groups.values()];
}
