import type { FilterSpecification } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-map-gl/maplibre";

import type { MarketStore } from "../../market/types";
import { resolveCategorySemanticGroup } from "../../market/categorySemantics";
import {
  createStoreFeatureCollection,
  STORE_CATEGORY_ICON_LAYER_ID,
  STORE_CATEGORY_LABEL_LAYER_ID,
  STORE_CLUSTER_CIRCLE_LAYER_ID,
  STORE_CLUSTER_COUNT_LAYER_ID,
  STORE_HOVER_HALO_LAYER_ID,
  STORE_POINT_HIT_LAYER_ID,
  STORE_POINT_LAYER_ID,
  STORE_POINT_SOURCE_ID,
  STORE_SELECTED_HALO_LAYER_ID,
  STORE_SELECTED_POINT_LAYER_ID,
  storeFeatureIdentity,
} from "./storeGeoJson";
import { SelectedStorePointSource, StorePointSource } from "./StorePointSources";

const NO_SELECTED_STORE = "__localtwin-no-selected-store__";
const NO_HOVERED_STORE = "__localtwin-no-hovered-store__";
const UNCLUSTERED_STORE_FILTER = ["!", ["has", "point_count"]];

type StorePointLayersProps = {
  stores: MarketStore[];
  selected: MarketStore | null;
  selectedCategoryName: string;
  visible: boolean;
  densityMode: boolean;
  storefrontMode: boolean;
};

function hoverFilter(featureId: string, selectedFeatureId: string): FilterSpecification {
  return [
    "all",
    UNCLUSTERED_STORE_FILTER,
    ["==", ["get", "featureId"], featureId],
    ["!=", ["get", "featureId"], selectedFeatureId],
  ] as unknown as FilterSpecification;
}

function useStoreHover(
  mapRef: ReturnType<typeof useMap>["current"],
  visible: boolean,
  selectedFeatureId: string,
) {
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !visible) return;
    const canvas = map.getCanvas();
    let hoveredFeatureId = NO_HOVERED_STORE;

    const applyHover = (featureId: string) => {
      if (featureId === hoveredFeatureId || !map.getLayer(STORE_HOVER_HALO_LAYER_ID)) return;
      hoveredFeatureId = featureId;
      canvas.style.cursor = featureId === NO_HOVERED_STORE ? "" : "pointer";
      map.setFilter(STORE_HOVER_HALO_LAYER_ID, hoverFilter(featureId, selectedFeatureId));
    };
    const handleMove = (event: MouseEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const point: [number, number] = [event.clientX - bounds.left, event.clientY - bounds.top];
      const layers = [STORE_CATEGORY_ICON_LAYER_ID, STORE_POINT_HIT_LAYER_ID].filter((layerId) => map.getLayer(layerId));
      const feature = layers.length > 0 ? map.queryRenderedFeatures(point, { layers })[0] : undefined;
      const featureId = feature?.properties?.featureId;
      applyHover(typeof featureId === "string" ? featureId : NO_HOVERED_STORE);
    };
    const handleLeave = () => applyHover(NO_HOVERED_STORE);

    canvas.addEventListener("mousemove", handleMove, { passive: true });
    canvas.addEventListener("mouseleave", handleLeave);
    return () => {
      canvas.removeEventListener("mousemove", handleMove);
      canvas.removeEventListener("mouseleave", handleLeave);
      canvas.style.cursor = "";
    };
  }, [mapRef, selectedFeatureId, visible]);
}

function useStoreSourcePerformance(
  mapRef: ReturnType<typeof useMap>["current"],
  data: ReturnType<typeof createStoreFeatureCollection>,
  visible: boolean,
) {
  const generationRef = useRef(0);
  const pendingRef = useRef<{ id: number; complete: boolean } | null>(null);

  const sourceIsReady = (map: { getSource: (id: string) => unknown; isSourceLoaded: (id: string) => boolean } | undefined) => {
    try {
      return Boolean(map?.getSource(STORE_POINT_SOURCE_ID) && map.isSourceLoaded(STORE_POINT_SOURCE_ID));
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !visible) return;
    const complete = () => {
      const pending = pendingRef.current;
      if (
        !pending ||
        pending.complete ||
        !sourceIsReady(map)
      ) return;
      pending.complete = true;
      performance.mark(`store-source-ready:${pending.id}`);
      performance.measure(`store-source-apply:${pending.id}`, `store-source-start:${pending.id}`, `store-source-ready:${pending.id}`);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        performance.mark(`store-source-visible:${pending.id}`);
        performance.measure(`store-source-visible:${pending.id}`, `store-source-start:${pending.id}`, `store-source-visible:${pending.id}`);
      }));
    };
    const handleSourceData = (event: { dataType?: string; sourceId?: string; isSourceLoaded?: boolean }) => {
      if (event.dataType === "source" && event.sourceId === STORE_POINT_SOURCE_ID && event.isSourceLoaded) complete();
    };

    map.on("sourcedata", handleSourceData);
    return () => { map.off("sourcedata", handleSourceData); };
  }, [mapRef, visible]);

  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !visible) return;
    const id = ++generationRef.current;
    pendingRef.current = { id, complete: false };
    performance.mark(`store-source-start:${id}`);
    requestAnimationFrame(() => {
      const pending = pendingRef.current;
      if (
        !pending ||
        pending.id !== id ||
        pending.complete ||
        !sourceIsReady(map)
      ) return;
      pending.complete = true;
      performance.mark(`store-source-ready:${id}`);
      performance.measure(`store-source-apply:${id}`, `store-source-start:${id}`, `store-source-ready:${id}`);
      requestAnimationFrame(() => {
        performance.mark(`store-source-visible:${id}`);
        performance.measure(`store-source-visible:${id}`, `store-source-start:${id}`, `store-source-visible:${id}`);
      });
    });
  }, [data, mapRef, visible]);
}

function useStorePointLayerOrder(
  mapRef: ReturnType<typeof useMap>["current"],
  visible: boolean,
  selected: MarketStore | null,
) {
  useEffect(() => {
    const map = mapRef?.getMap();
    if (!map || !visible) return;

    const arrange = () => {
      for (const layerId of [
        STORE_CLUSTER_CIRCLE_LAYER_ID,
        STORE_CLUSTER_COUNT_LAYER_ID,
        STORE_POINT_LAYER_ID,
        STORE_HOVER_HALO_LAYER_ID,
        STORE_CATEGORY_ICON_LAYER_ID,
        STORE_CATEGORY_LABEL_LAYER_ID,
        ...(selected ? [STORE_SELECTED_HALO_LAYER_ID, STORE_SELECTED_POINT_LAYER_ID] : []),
      ]) {
        if (map.getLayer(layerId)) map.moveLayer(layerId);
      }
    };

    let secondFrame: number | null = null;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(arrange);
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) cancelAnimationFrame(secondFrame);
    };
  }, [mapRef, selected, visible]);
}

export function StorePointLayers({ stores, selected, selectedCategoryName, visible, densityMode, storefrontMode }: StorePointLayersProps) {
  const { current: mapRef } = useMap();
  const categoryGroup = resolveCategorySemanticGroup(selectedCategoryName);
  const data = useMemo(() => createStoreFeatureCollection(stores, categoryGroup), [categoryGroup, stores]);
  const selectedData = useMemo(() => createStoreFeatureCollection(selected ? [selected] : [], categoryGroup), [categoryGroup, selected]);
  const selectedFeatureId = selected ? storeFeatureIdentity(selected) : NO_SELECTED_STORE;
  useStoreHover(mapRef, visible, selectedFeatureId);
  useStoreSourcePerformance(mapRef, data, visible);
  useStorePointLayerOrder(mapRef, visible, selected);

  if (!visible || stores.length === 0) return null;
  return <>
    <StorePointSource data={data} selectedFeatureId={selectedFeatureId} densityMode={densityMode} hasFocusedStore={storefrontMode && selected !== null} />
    {selected && <SelectedStorePointSource data={selectedData} />}
  </>;
}
