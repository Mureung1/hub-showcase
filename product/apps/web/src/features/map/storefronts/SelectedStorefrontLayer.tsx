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
    let installing = false;

    function removeReadyListeners() {
      if (!mapInstance) return;
      mapInstance.off("styledata", installWhenReady);
      mapInstance.off("idle", installWhenReady);
    }

    async function installLayer() {
      if (!mapInstance || installing || layerRef.current) return;
      installing = true;
      try {
        const { createStorefrontMapLayer } = await import("./createStorefrontMapLayer");
        if (cancelled) return;
        removeLayerIfPresent(mapInstance);
        const layer = createStorefrontMapLayer(layerInput(storeRef.current));
        layerRef.current = layer;
        mapInstance.addLayer(layer);
        mapInstance.triggerRepaint();
        removeReadyListeners();
      } catch (error) {
        if (import.meta.env.DEV) console.warn("LocalTwin 3D storefront fallback", error);
        layerRef.current = null;
        onUnavailableRef.current();
        removeReadyListeners();
      } finally {
        installing = false;
      }
    }

    function installWhenReady() {
      if (mapInstance?.isStyleLoaded()) void installLayer();
    }

    mapInstance.on("styledata", installWhenReady);
    mapInstance.on("idle", installWhenReady);
    installWhenReady();

    return () => {
      cancelled = true;
      removeReadyListeners();
      removeLayerIfPresent(mapInstance);
      layerRef.current = null;
    };
  }, [mapRef]);

  useEffect(() => {
    try {
      layerRef.current?.setStore(layerInput(store));
    } catch (error) {
      if (import.meta.env.DEV) console.warn("LocalTwin 3D storefront update fallback", error);
      onUnavailableRef.current();
    }
  }, [store]);

  return null;
}
