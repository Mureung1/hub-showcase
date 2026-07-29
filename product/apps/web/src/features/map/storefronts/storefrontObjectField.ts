import { categoryFocusCode } from "../../market/categorySemantics";
import type { MarketStore } from "../../market/types";
import type { MapBounds } from "../supportedRegions";
import { hasStorefrontVariant } from "./storefrontRegistry";
import type { SelectedStorefront } from "./SelectedStorefrontLayer";

export function storefrontStoreIdentity(store: MarketStore) {
  return store.id ?? `${store.name}:${store.longitude}:${store.latitude}`;
}

export function buildStorefrontObjectField({
  stores,
  selected,
}: {
  stores: MarketStore[];
  selected: MarketStore | null;
  bounds: MapBounds | null;
  limit?: number;
}): SelectedStorefront[] {
  if (!selected) return [];
  const selectedIdentity = storefrontStoreIdentity(selected);
  const currentStore = stores.find(
    (store) => storefrontStoreIdentity(store) === selectedIdentity,
  );
  if (!currentStore) return [];
  const categoryCode = categoryFocusCode(currentStore.category, currentStore.categoryCode);
  if (!hasStorefrontVariant(categoryCode)) return [];
  return [
    {
      id: selectedIdentity,
      longitude: currentStore.longitude,
      latitude: currentStore.latitude,
      categoryCode,
      placementMode: "selected-focus",
      building: null,
    },
  ];
}
