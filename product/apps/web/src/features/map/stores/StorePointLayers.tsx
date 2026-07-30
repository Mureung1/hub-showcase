import type { ExpressionSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { MarketStore } from "../../market/types";
import {
  createStoreFeatureCollection,
  STORE_CATEGORY_ICON_LAYER_ID,
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
const STORE_ICON_MIN_ZOOM = 15.55;

type StorePointLayersProps = {
  stores: MarketStore[];
  selected: MarketStore | null;
  visible: boolean;
  densityMode: boolean;
  storefrontMode: boolean;
};

export function StorePointLayers({
  stores,
  selected,
  visible,
  densityMode,
  storefrontMode,
}: StorePointLayersProps) {
  const data = useMemo(() => createStoreFeatureCollection(stores), [stores]);
  const selectedFeatureId = selected ? storeFeatureIdentity(selected) : NO_SELECTED_STORE;
  const hasFocusedStore = storefrontMode && selected !== null;

  if (!visible || stores.length === 0) return null;

  return (
    <Source
      id={STORE_POINT_SOURCE_ID}
      type="geojson"
      data={data}
      maxzoom={18}
      buffer={64}
    >
      <Layer
        id={STORE_POINT_LAYER_ID}
        type="circle"
        paint={{
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-radius": densityMode
            ? ["interpolate", ["linear"], ["zoom"], 13, 2.4, 15.5, 3.8, 17.5, 4.8]
            : ["interpolate", ["linear"], ["zoom"], 13, 3.2, 15.5, 4.8, 17.5, 5.8],
          "circle-opacity": hasFocusedStore
            ? 0.24
            : densityMode
              ? [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.42,
                  15.4,
                  0.68,
                  STORE_ICON_MIN_ZOOM,
                  0.28,
                  17.5,
                  0.12,
                ]
              : [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  13,
                  0.72,
                  STORE_ICON_MIN_ZOOM,
                  0.26,
                  17.5,
                  0.1,
                ],
          "circle-stroke-color": "rgba(255, 255, 255, 0.92)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 17, 1.2],
          "circle-blur": densityMode ? 0.08 : 0,
        }}
      />
      <Layer
        id={STORE_SELECTED_HALO_LAYER_ID}
        type="circle"
        filter={["==", ["get", "featureId"], selectedFeatureId]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 17],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.2,
          "circle-stroke-color": "rgba(255, 255, 255, 0.96)",
          "circle-stroke-width": 2,
          "circle-blur": 0.25,
        }}
      />
      <Layer
        id={STORE_SELECTED_POINT_LAYER_ID}
        type="circle"
        filter={["==", ["get", "featureId"], selectedFeatureId]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 7.5, 17, 11.5],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.94,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        }}
      />
      <Layer
        id={STORE_CATEGORY_ICON_LAYER_ID}
        type="symbol"
        minzoom={STORE_ICON_MIN_ZOOM}
        layout={{
          "icon-image": STORE_CATEGORY_ICON_IMAGE_EXPRESSION,
          "icon-size": [
            "interpolate",
            ["linear"],
            ["zoom"],
            STORE_ICON_MIN_ZOOM,
            0.62,
            17,
            0.82,
            19,
            1,
          ],
          "icon-anchor": "bottom",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-padding": 1,
        }}
        paint={{
          "icon-opacity": hasFocusedStore
            ? 0.46
            : ["interpolate", ["linear"], ["zoom"], STORE_ICON_MIN_ZOOM, 0.86, 17, 1],
        }}
      />
      <Layer
        id={STORE_POINT_HIT_LAYER_ID}
        type="circle"
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 9, 17, 14],
          "circle-color": "#000000",
          "circle-opacity": 0.01,
        }}
      />
    </Source>
  );
}
