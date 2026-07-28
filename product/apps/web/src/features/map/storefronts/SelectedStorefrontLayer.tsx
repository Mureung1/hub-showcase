import type { Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

import type { StorefrontMapLayer, StorefrontMapLayerInput } from "./createStorefrontMapLayer";

export const SELECTED_STOREFRONT_LAYER_ID = "localtwin-selected-storefront";

export type StorefrontPlacementMode =
  | "replace-building"
  | "rooftop-marker"
  | "selected-focus";

export type SelectedStorefront = {
  id: string;
  longitude: number;
  latitude: number;
  categoryCode: string;
  placementMode?: StorefrontPlacementMode;
  building?: {
    id: string;
    center: [number, number];
    plotSizeMeters: number;
    heightMeters: number;
    storeCountInBuilding: number;
  } | null;
};

type StorefrontLayerProps = {
  layerId: string;
  store: SelectedStorefront;
  onUnavailable: () => void;
  onReady?: (storeId: string) => void;
};

function layerInput(store: SelectedStorefront, layerId: string): StorefrontMapLayerInput {
  return {
    id: layerId,
    longitude: store.longitude,
    latitude: store.latitude,
    categoryCode: store.categoryCode,
    placementMode: store.placementMode ?? "replace-building",
    source: store.building ? "LocalTwin overlay building" : "LocalTwin search API",
    sourceId: store.building?.id ?? store.id,
    building: store.building,
  };
}

function removeLayerIfPresent(mapInstance: MapLibreMap, layerId: string) {
  try {
    const style = mapInstance.getStyle();
    if (style?.layers.some((layer) => layer.id === layerId)) {
      mapInstance.removeLayer(layerId);
    }
  } catch {
    // The MapLibre style may already be destroyed during HMR or parent map teardown.
  }
}

export function StorefrontLayer({ layerId, store, onUnavailable, onReady }: StorefrontLayerProps) {
  const { current: mapRef } = useMap();
  const storeRef = useRef(store);
  const onUnavailableRef = useRef(onUnavailable);
  const onReadyRef = useRef(onReady);
  const layerRef = useRef<StorefrontMapLayer | null>(null);
  storeRef.current = store;
  onUnavailableRef.current = onUnavailable;
  onReadyRef.current = onReady;

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
        removeLayerIfPresent(mapInstance, layerId);
        const layer = createStorefrontMapLayer(layerInput(storeRef.current, layerId));
        layerRef.current = layer;
        mapInstance.addLayer(layer);
        onReadyRef.current?.(storeRef.current.id);
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
      removeLayerIfPresent(mapInstance, layerId);
      layerRef.current = null;
    };
  }, [layerId, mapRef]);

  useEffect(() => {
    try {
      layerRef.current?.setStore(layerInput(store, layerId));
      if (layerRef.current) onReadyRef.current?.(store.id);
    } catch (error) {
      if (import.meta.env.DEV) console.warn("LocalTwin 3D storefront update fallback", error);
      onUnavailableRef.current();
    }
  }, [layerId, store]);

  return null;
}

export function SelectedStorefrontLayer({
  store,
  onUnavailable,
  onReady,
}: Omit<StorefrontLayerProps, "layerId">) {
  return (
    <StorefrontLayer
      layerId={SELECTED_STOREFRONT_LAYER_ID}
      store={store}
      onUnavailable={onUnavailable}
      onReady={onReady}
    />
  );
}
