import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

import {
  SELECTED_STOREFRONT_LAYER_ID,
  StorefrontLayer,
  type SelectedStorefront,
} from "./SelectedStorefrontLayer";

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
  const { current: mapRef } = useMap();
  const selectedFocus = stores.find((store) => store.placementMode === "selected-focus") ?? null;

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map) return;
    let legacyLayerIds: string[] = [];
    try {
      legacyLayerIds =
        map
          .getStyle()
          ?.layers.filter(
            (layer) =>
              layer.id.startsWith("localtwin-storefront-") &&
              layer.id !== SELECTED_STOREFRONT_LAYER_ID,
          )
          .map((layer) => layer.id) ?? [];
    } catch {
      return;
    }
    for (const layerId of legacyLayerIds) {
      try {
        map.removeLayer(layerId);
      } catch {
        // A concurrent category transition may already have removed the legacy layer.
      }
    }
  }, [mapRef, stores]);

  return (
    <>
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
