import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

import type { StorefrontMapLayer, StorefrontMapLayerInput } from "./createStorefrontMapLayer";

const SELECTED_STOREFRONT_LAYER_ID = "localtwin-selected-storefront";

export type SelectedStorefront = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
};

type SelectedStorefrontLayerProps = {
  store: SelectedStorefront;
  onUnavailable: () => void;
};

function layerInput(store: SelectedStorefront): StorefrontMapLayerInput {
  return {
    id: SELECTED_STOREFRONT_LAYER_ID,
    longitude: store.longitude,
    latitude: store.latitude,
    categoryCode: store.categoryCode,
    source: "LocalTwin search API",
    sourceId: store.id,
  };
}

function removeLayerIfPresent(mapInstance: MapLibreMap) {
  try {
    const style = mapInstance.getStyle();
    if (style?.layers.some((layer) => layer.id === SELECTED_STOREFRONT_LAYER_ID)) {
      mapInstance.removeLayer(SELECTED_STOREFRONT_LAYER_ID);
    }
  } catch {
    // The MapLibre style may already be destroyed during HMR or parent map teardown.
  }
}

export function SelectedStorefrontLayer({ store, onUnavailable }: SelectedStorefrontLayerProps) {
  const { current: mapRef } = useMap();
  const storeRef = useRef(store);
  const onUnavailableRef = useRef(onUnavailable);
  const layerRef = useRef<StorefrontMapLayer | null>(null);
  storeRef.current = store;
  onUnavailableRef.current = onUnavailable;

  useEffect(() => {
    const mapInstance = mapRef?.getMap();
    if (!mapInstance) return;
    let cancelled = false;

    async function installLayer() {
      if (!mapInstance) return;
      try {
        const { createStorefrontMapLayer } = await import("./createStorefrontMapLayer");
        if (cancelled) return;
        removeLayerIfPresent(mapInstance);
        const layer = createStorefrontMapLayer(layerInput(storeRef.current));
        layerRef.current = layer;
        mapInstance.addLayer(layer);
        mapInstance.triggerRepaint();
      } catch {
        layerRef.current = null;
        onUnavailableRef.current();
      }
    }

    if (mapInstance.isStyleLoaded()) void installLayer();
    else mapInstance.once("load", installLayer);

    return () => {
      cancelled = true;
      mapInstance.off("load", installLayer);
      removeLayerIfPresent(mapInstance);
      layerRef.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    try {
      layerRef.current?.setStore(layerInput(store));
    } catch {
      onUnavailableRef.current();
    }
  }, [store]);

  return null;
}
