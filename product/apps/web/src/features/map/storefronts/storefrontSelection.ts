import type { MarketStore } from "../../market/types";
import { distanceMeters, type MapBounds } from "../supportedRegions";

type StorefrontSelectionOptions = {
  selectedId?: string | null;
  selectedName: string | null;
  focus: [number, number] | null;
  limit: number;
  minimumDistanceMeters: number;
  bounds?: MapBounds | null;
};

function isInsideBounds(store: MarketStore, bounds: MapBounds) {
  return (
    store.longitude >= bounds.west &&
    store.longitude <= bounds.east &&
    store.latitude >= bounds.south &&
    store.latitude <= bounds.north
  );
}

export function selectMapStores(stores: MarketStore[], options: StorefrontSelectionOptions) {
  const { selectedId, selectedName, focus, limit, minimumDistanceMeters, bounds } = options;
  const selectedStore =
    stores.find(
      (store) => selectedId !== null && selectedId !== undefined && store.id === selectedId,
    ) ?? stores.find((store) => store.name === selectedName);
  const selectedStores = selectedStore ? [selectedStore] : [];
  const occupied: Array<[number, number]> = focus ? [focus] : [];
  if (selectedStore) occupied.push([selectedStore.longitude, selectedStore.latitude]);

  for (const store of stores) {
    if (selectedStores.length >= limit) break;
    if (store === selectedStore) continue;
    if (bounds && !isInsideBounds(store, bounds)) continue;
    const coordinate: [number, number] = [store.longitude, store.latitude];
    if (
      occupied.some(
        (occupiedCoordinate) =>
          distanceMeters(occupiedCoordinate, coordinate) < minimumDistanceMeters,
      )
    ) {
      continue;
    }
    selectedStores.push(store);
    occupied.push(coordinate);
  }

  return selectedStores;
}
