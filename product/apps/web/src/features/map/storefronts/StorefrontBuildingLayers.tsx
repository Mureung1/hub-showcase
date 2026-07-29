import {
  SELECTED_STOREFRONT_LAYER_ID,
  StorefrontLayer,
  type SelectedStorefront,
} from "./SelectedStorefrontLayer";
import { storefrontLayerId } from "./storefrontLayerId";

type StorefrontBuildingLayersProps = {
  stores: SelectedStorefront[];
  onUnavailable: () => void;
  onReady: (storeId: string) => void;
};

export function StorefrontBuildingLayers({
  stores,
  onUnavailable,
  onReady,
}: StorefrontBuildingLayersProps) {
  const selectedFocus = stores.find((store) => store.placementMode === "selected-focus") ?? null;
  const buildingStores = stores.filter((store) => store.placementMode !== "selected-focus");

  return (
    <>
      {buildingStores.map((store) => (
        <StorefrontLayer
          key={store.id}
          layerId={storefrontLayerId(store.id)}
          store={store}
          onUnavailable={onUnavailable}
          onReady={onReady}
        />
      ))}
      {selectedFocus && (
        <StorefrontLayer
          key={SELECTED_STOREFRONT_LAYER_ID}
          layerId={SELECTED_STOREFRONT_LAYER_ID}
          store={selectedFocus}
          onUnavailable={onUnavailable}
          onReady={onReady}
        />
      )}
    </>
  );
}
