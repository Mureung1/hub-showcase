import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { useEffect, useMemo } from "react";
import { Layer, Source, useMap } from "react-map-gl/maplibre";

import type { MarketStore } from "../../market/types";
import {
  createStoreFeatureCollection,
  STORE_CATEGORY_ICON_LAYER_ID,
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
import { STORE_CATEGORY_ICON_IMAGE_EXPRESSION } from "./storeIconRegistry";

const STORE_COLOR_EXPRESSION: ExpressionSpecification = [
  "match",
  ["get", "categoryGroup"],
  "cafe",
  "#008f5a",
  "food",
  "#c7642d",
  "bakery",
  "#93651d",
  "convenience",
  "#315f9e",
  "flower",
  "#9f6818",
  "beauty",
  "#b94972",
  "apparel",
  "#6f50b6",
  "sports",
  "#117770",
  "academy",
  "#2b7696",
  "lodging",
  "#845079",
  "#606d65",
];

const NO_SELECTED_STORE = "__localtwin-no-selected-store__";
const NO_HOVERED_STORE = "__localtwin-no-hovered-store__";
const STORE_ICON_MIN_ZOOM = 15.25;
const UNCLUSTERED_STORE_FILTER: ExpressionSpecification = ["!", ["has", "point_count"]];

const CLUSTER_COLOR_EXPRESSION: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  "#dff4ea",
  20,
  "#8ed4b2",
  60,
  "#3b9d73",
  180,
  "#17664c",
];

const CLUSTER_RADIUS_EXPRESSION: ExpressionSpecification = [
  "step",
  ["get", "point_count"],
  13,
  20,
  17,
  60,
  21,
  180,
  27,
];

type StorePointLayersProps = {
  stores: MarketStore[];
  selected: MarketStore | null;
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

export function StorePointLayers({
  stores,
  selected,
  visible,
  densityMode,
  storefrontMode,
}: StorePointLayersProps) {
  const { current: mapRef } = useMap();
  const data = useMemo(() => createStoreFeatureCollection(stores), [stores]);
  const selectedFeatureId = selected ? storeFeatureIdentity(selected) : NO_SELECTED_STORE;
  const hasFocusedStore = storefrontMode && selected !== null;

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
      const feature = map.queryRenderedFeatures(point, {
        layers: [STORE_CATEGORY_ICON_LAYER_ID, STORE_POINT_HIT_LAYER_ID],
      })[0];
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

  if (!visible || stores.length === 0) return null;

  return (
    <Source
      id={STORE_POINT_SOURCE_ID}
      type="geojson"
      data={data}
      cluster
      clusterMaxZoom={15}
      clusterRadius={46}
      clusterMinPoints={3}
      maxzoom={18}
      buffer={64}
    >
      <Layer
        id={STORE_CLUSTER_CIRCLE_LAYER_ID}
        type="circle"
        filter={["has", "point_count"]}
        maxzoom={15.25}
        paint={{
          "circle-color": CLUSTER_COLOR_EXPRESSION,
          "circle-radius": CLUSTER_RADIUS_EXPRESSION,
          "circle-opacity": 0.94,
          "circle-stroke-color": "rgba(255, 255, 255, 0.96)",
          "circle-stroke-width": 2.4,
        }}
      />
      <Layer
        id={STORE_CLUSTER_COUNT_LAYER_ID}
        type="symbol"
        filter={["has", "point_count"]}
        maxzoom={15.25}
        layout={{
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        }}
        paint={{
          "text-color": [
            "step",
            ["get", "point_count"],
            "#164a38",
            60,
            "#ffffff",
          ],
          "text-halo-color": "rgba(255, 255, 255, 0.5)",
          "text-halo-width": 0.6,
        }}
      />
      <Layer
        id={STORE_POINT_LAYER_ID}
        type="circle"
        filter={UNCLUSTERED_STORE_FILTER}
        paint={{
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-radius": densityMode
            ? ["interpolate", ["linear"], ["zoom"], 13, 2.8, 15.5, 4.1, 17.5, 5]
            : ["interpolate", ["linear"], ["zoom"], 13, 3.4, 15.5, 5, 17.5, 6],
          "circle-opacity": hasFocusedStore
            ? 0.5
            : densityMode
              ? [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.48,
                  15.15,
                  0.72,
                  STORE_ICON_MIN_ZOOM,
                  0.34,
                  17.5,
                  0.14,
                ]
              : [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.78,
                  STORE_ICON_MIN_ZOOM,
                  0.32,
                  17.5,
                  0.12,
                ],
          "circle-stroke-color": "rgba(255, 255, 255, 0.94)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 17, 1.4],
          "circle-blur": densityMode ? 0.06 : 0,
        }}
      />
      <Layer
        id={STORE_HOVER_HALO_LAYER_ID}
        type="circle"
        filter={hoverFilter(NO_HOVERED_STORE, selectedFeatureId)}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 11.5, 17, 18.5],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.34,
          "circle-stroke-color": "rgba(255, 255, 255, 0.98)",
          "circle-stroke-width": 2.3,
          "circle-blur": 0.34,
        }}
      />
      <Layer
        id={STORE_SELECTED_HALO_LAYER_ID}
        type="circle"
        filter={[
          "all",
          UNCLUSTERED_STORE_FILTER,
          ["==", ["get", "featureId"], selectedFeatureId],
        ]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 12, 17, 18],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.28,
          "circle-stroke-color": "rgba(255, 255, 255, 0.98)",
          "circle-stroke-width": 2.5,
          "circle-blur": 0.22,
        }}
      />
      <Layer
        id={STORE_SELECTED_POINT_LAYER_ID}
        type="circle"
        filter={[
          "all",
          UNCLUSTERED_STORE_FILTER,
          ["==", ["get", "featureId"], selectedFeatureId],
        ]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 8, 17, 12],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.98,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3.2,
        }}
      />
      <Layer
        id={STORE_CATEGORY_ICON_LAYER_ID}
        type="symbol"
        filter={UNCLUSTERED_STORE_FILTER}
        minzoom={STORE_ICON_MIN_ZOOM}
        layout={{
          "icon-image": STORE_CATEGORY_ICON_IMAGE_EXPRESSION,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            STORE_ICON_MIN_ZOOM,
            0.72,
            17,
            0.94,
            19,
            1.12,
          ],
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-padding": 1,
        }}
        paint={{
          "icon-opacity": hasFocusedStore
            ? 0.78
            : ["interpolate", ["linear"], ["zoom"], STORE_ICON_MIN_ZOOM, 0.9, 17, 1],
        }}
      />
      <Layer
        id={STORE_POINT_HIT_LAYER_ID}
        type="circle"
        filter={UNCLUSTERED_STORE_FILTER}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 12, 17, 19],
          "circle-color": "#000000",
          "circle-opacity": 0.01,
        }}
      />
    </Source>
  );
}
