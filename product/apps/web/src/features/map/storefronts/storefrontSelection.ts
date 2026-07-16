import type { MarketStore } from "../../market/types";
import { distanceMeters } from "../supportedRegions";

type StorefrontSelectionOptions = {
  selectedName: string | null;
  focus: [number, number] | null;
  limit: number;
  minimumDistanceMeters: number;
};

export function selectMapStores(
  stores: MarketStore[],
  { selectedName, focus, limit, minimumDistanceMeters }: StorefrontSelectionOptions,
) {
  const selectedStore = stores.find((store) => store.name === selectedName);
  const selectedStores = selectedStore ? [selectedStore] : [];
  const occupied: Array<[number, number]> = focus ? [focus] : [];
  if (selectedStore) occupied.push([selectedStore.longitude, selectedStore.latitude]);

  for (const store of stores) {
    if (selectedStores.length >= limit) break;
    if (store === selectedStore) continue;
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
