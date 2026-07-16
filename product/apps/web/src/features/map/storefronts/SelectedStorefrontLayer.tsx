import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";

const SELECTED_STOREFRONT_LAYER_ID = "localtwin-selected-storefront";

export type SelectedStorefront = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
};

type SelectedStorefrontLayerProps = {
  store: SelectedStorefront;
};

export function SelectedStorefrontLayer({ store }: SelectedStorefrontLayerProps) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    const mapInstance = mapRef?.getMap();
    if (!mapInstance) return;
    let cancelled = false;

    async function installLayer() {
      if (!mapInstance) return;
      const { createStorefrontMapLayer } = await import("./createStorefrontMapLayer");
      if (cancelled || mapInstance.getLayer(SELECTED_STOREFRONT_LAYER_ID)) return;
      mapInstance.addLayer(
        createStorefrontMapLayer({
          id: SELECTED_STOREFRONT_LAYER_ID,
          longitude: store.longitude,
          latitude: store.latitude,
          categoryCode: store.categoryCode,
          source: "LocalTwin search API",
          sourceId: store.id,
        }),
      );
      mapInstance.triggerRepaint();
    }

    if (mapInstance.isStyleLoaded()) void installLayer();
    else mapInstance.once("load", installLayer);

    return () => {
      cancelled = true;
      mapInstance.off("load", installLayer);
      if (mapInstance.getLayer(SELECTED_STOREFRONT_LAYER_ID)) {
        mapInstance.removeLayer(SELECTED_STOREFRONT_LAYER_ID);
      }
    };
  }, [mapRef, store]);

  return null;
}
