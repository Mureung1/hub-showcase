import { StorefrontLayer, type SelectedStorefront } from "./SelectedStorefrontLayer";
import { storefrontLayerId } from "./storefrontLayerId";

type StorefrontBuildingLayersProps = {
  stores: SelectedStorefront[];
  onUnavailable: () => void;
  onReady: (storeId: string) => void;
};

export function StorefrontBuildingLayers({ stores, onUnavailable, onReady }: StorefrontBuildingLayersProps) {
  return stores.map((store) => (
    <StorefrontLayer
      key={store.id}
      layerId={storefrontLayerId(store.id)}
      store={store}
      onUnavailable={onUnavailable}
      onReady={onReady}
    />
  ));
}
