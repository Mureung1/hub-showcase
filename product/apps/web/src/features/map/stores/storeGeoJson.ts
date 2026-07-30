import { resolveCategorySemanticGroup } from "../../market/categorySemantics";
import type { MarketStore } from "../../market/types";

export const STORE_POINT_SOURCE_ID = "localtwin-store-points";
export const STORE_POINT_LAYER_ID = "localtwin-store-points-visible";
export const STORE_POINT_HIT_LAYER_ID = "localtwin-store-points-hit";
export const STORE_SELECTED_HALO_LAYER_ID = "localtwin-store-selected-halo";
export const STORE_SELECTED_POINT_LAYER_ID = "localtwin-store-selected-point";

export function storeFeatureIdentity(store: MarketStore) {
  return store.id ?? `${store.name}:${store.longitude}:${store.latitude}`;
}

export function storeSelectionKey(store: MarketStore) {
  return store.id ?? store.name;
}

export function createStoreFeatureCollection(stores: MarketStore[]) {
  return {
    type: "FeatureCollection" as const,
    features: stores.map((store) => ({
      type: "Feature" as const,
      id: storeFeatureIdentity(store),
      properties: {
        featureId: storeFeatureIdentity(store),
        storeKey: storeSelectionKey(store),
        name: store.name,
        category: store.category,
        categoryGroup: resolveCategorySemanticGroup(store.category),
      },
      geometry: {
        type: "Point" as const,
        coordinates: [store.longitude, store.latitude] as [number, number],
      },
    })),
  };
}
