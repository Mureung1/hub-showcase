import type { MarketStore } from "../market/types";

export const STORE_MARKER_DETAIL_ZOOM = 16.2;

export type StoreMarkerGroup = {
  store: MarketStore;
  count: number;
};

function markerCellMeters(zoom: number) {
  if (zoom < 14.8) return 180;
  if (zoom < 15.6) return 95;
  return 52;
}

function storeIdentity(store: MarketStore) {
  return store.id ?? `${store.name}:${store.longitude}:${store.latitude}`;
}

export function groupStoreMarkers(
  stores: MarketStore[],
  zoom: number,
  selectedName: string | null,
): StoreMarkerGroup[] {
  if (zoom >= STORE_MARKER_DETAIL_ZOOM) {
    return stores.map((store) => ({ store, count: 1 }));
  }

  const cellMeters = markerCellMeters(zoom);
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
