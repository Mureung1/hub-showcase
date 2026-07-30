import type { ExpressionSpecification } from "maplibre-gl";
import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { MarketStore } from "../../market/types";
import {
  createStoreFeatureCollection,
  STORE_POINT_HIT_LAYER_ID,
  STORE_POINT_LAYER_ID,
  STORE_POINT_SOURCE_ID,
  STORE_SELECTED_HALO_LAYER_ID,
  STORE_SELECTED_POINT_LAYER_ID,
  storeFeatureIdentity,
} from "./storeGeoJson";

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
            ? ["interpolate", ["linear"], ["zoom"], 13, 2.4, 15.5, 3.8, 17.5, 6.2]
            : ["interpolate", ["linear"], ["zoom"], 13, 3.2, 15.5, 5.2, 17.5, 7.2],
          "circle-opacity": hasFocusedStore
            ? 0.42
            : densityMode
              ? ["interpolate", ["linear"], ["zoom"], 13, 0.42, 15.7, 0.68, 17.5, 0.9]
              : 0.9,
          "circle-stroke-color": "rgba(255, 255, 255, 0.92)",
          "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.6, 17, 1.5],
          "circle-blur": densityMode ? 0.08 : 0,
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
      <Layer
        id={STORE_SELECTED_HALO_LAYER_ID}
        type="circle"
        filter={["==", ["get", "featureId"], selectedFeatureId]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 11, 17, 16],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 0.18,
          "circle-stroke-color": "rgba(255, 255, 255, 0.94)",
          "circle-stroke-width": 2,
          "circle-blur": 0.25,
        }}
      />
      <Layer
        id={STORE_SELECTED_POINT_LAYER_ID}
        type="circle"
        filter={["==", ["get", "featureId"], selectedFeatureId]}
        paint={{
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 6.5, 17, 10],
          "circle-color": STORE_COLOR_EXPRESSION,
          "circle-opacity": 1,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
        }}
      />
    </Source>
  );
}
