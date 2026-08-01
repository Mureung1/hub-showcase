import type { ExpressionSpecification, FilterSpecification } from "maplibre-gl";
import { Layer, Source } from "react-map-gl/maplibre";

import { createStoreFeatureCollection, STORE_CATEGORY_ICON_LAYER_ID, STORE_CATEGORY_LABEL_LAYER_ID, STORE_CLUSTER_CIRCLE_LAYER_ID, STORE_CLUSTER_COUNT_LAYER_ID, STORE_HOVER_HALO_LAYER_ID, STORE_POINT_HIT_LAYER_ID, STORE_POINT_LAYER_ID, STORE_POINT_SOURCE_ID, STORE_SELECTED_HALO_LAYER_ID, STORE_SELECTED_POINT_LAYER_ID, STORE_SELECTED_POINT_SOURCE_ID } from "./storeGeoJson";
import { STORE_CATEGORY_ICON_IMAGE_EXPRESSION } from "./storeIconRegistry";

const STORE_COLOR_EXPRESSION: ExpressionSpecification = ["match", ["get", "categoryGroup"], "cafe", "#008f5a", "food", "#c7642d", "bakery", "#93651d", "convenience", "#315f9e", "flower", "#9f6818", "beauty", "#b94972", "apparel", "#6f50b6", "sports", "#117770", "academy", "#2b7696", "lodging", "#845079", "#606d65"];
const STORE_CLUSTER_MAX_ZOOM = 13;
const STORE_CLUSTER_LAYER_MAX_ZOOM = STORE_CLUSTER_MAX_ZOOM + 1;
const STORE_RAW_POINT_MIN_ZOOM = STORE_CLUSTER_LAYER_MAX_ZOOM;
const STORE_ICON_MIN_ZOOM = 15.35;
const STORE_LABEL_MIN_ZOOM = 16;
const STORE_RAW_POINT_MAX_ZOOM = 16.15;
const UNCLUSTERED_STORE_FILTER: ExpressionSpecification = ["!", ["has", "point_count"]];
const CLUSTER_COLOR_EXPRESSION: ExpressionSpecification = ["step", ["get", "point_count"], "#dff4ea", 20, "#8ed4b2", 60, "#3b9d73", 180, "#17664c"];
const CLUSTER_RADIUS_EXPRESSION: ExpressionSpecification = ["step", ["get", "point_count"], 13, 20, 17, 60, 21, 180, 27];

function StoreClusterLayers() {
  const fadeOut: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], 10, 0.94, 13.4, 0.9, 13.8, 0.4, 13.98, 0.15];
  return <>
    <Layer id={STORE_CLUSTER_CIRCLE_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="circle" filter={["has", "point_count"]} maxzoom={STORE_CLUSTER_LAYER_MAX_ZOOM} paint={{ "circle-color": CLUSTER_COLOR_EXPRESSION, "circle-radius": CLUSTER_RADIUS_EXPRESSION, "circle-opacity": fadeOut, "circle-stroke-color": "rgba(255, 255, 255, 0.96)", "circle-stroke-width": 2.4 }} />
    <Layer id={STORE_CLUSTER_COUNT_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="symbol" filter={["has", "point_count"]} maxzoom={STORE_CLUSTER_LAYER_MAX_ZOOM} layout={{ "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-allow-overlap": true, "text-ignore-placement": true }} paint={{ "text-color": ["step", ["get", "point_count"], "#164a38", 60, "#ffffff"], "text-halo-color": "rgba(255, 255, 255, 0.5)", "text-halo-width": 0.6, "text-opacity": fadeOut }} />
  </>;
}

function StoreRawPointLayers({ densityMode, hasFocusedStore, selectedFeatureId }: { densityMode: boolean; hasFocusedStore: boolean; selectedFeatureId: string }) {
  const pointOpacity: number | ExpressionSpecification = hasFocusedStore ? 0.5 : ["interpolate", ["linear"], ["zoom"], 14, densityMode ? 0.45 : 0.55, 14.2, densityMode ? 0.9 : 0.92, 15.25, 0.88, 15.55, 0.72, 15.85, 0.25, 16.1, 0];
  const hoverFilter: FilterSpecification = ["all", UNCLUSTERED_STORE_FILTER, ["==", ["get", "featureId"], "__localtwin-no-hovered-store__"], ["!=", ["get", "featureId"], selectedFeatureId]] as unknown as FilterSpecification;
  return <>
    <Layer id={STORE_POINT_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="circle" filter={UNCLUSTERED_STORE_FILTER} minzoom={STORE_RAW_POINT_MIN_ZOOM} maxzoom={STORE_RAW_POINT_MAX_ZOOM} paint={{ "circle-color": STORE_COLOR_EXPRESSION, "circle-radius": densityMode ? ["interpolate", ["linear"], ["zoom"], 14, 3, 14.8, 3.8, 15.5, 4.6, 16.1, 5] : ["interpolate", ["linear"], ["zoom"], 14, 3.4, 14.8, 4.2, 15.5, 5, 16.1, 5.6], "circle-opacity": pointOpacity, "circle-stroke-color": "rgba(255, 255, 255, 0.94)", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 13, 0.8, 17, 1.4], "circle-blur": densityMode ? 0.06 : 0 }} />
    <Layer id={STORE_HOVER_HALO_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="circle" filter={hoverFilter} paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 11.5, 17, 18.5], "circle-color": STORE_COLOR_EXPRESSION, "circle-opacity": 0.34, "circle-stroke-color": "rgba(255, 255, 255, 0.98)", "circle-stroke-width": 2.3, "circle-blur": 0.34 }} />
    <Layer id={STORE_CATEGORY_ICON_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="symbol" filter={UNCLUSTERED_STORE_FILTER} minzoom={STORE_ICON_MIN_ZOOM} layout={{ "icon-image": STORE_CATEGORY_ICON_IMAGE_EXPRESSION, "icon-size": ["interpolate", ["linear"], ["zoom"], STORE_ICON_MIN_ZOOM, 0.72, 17, 0.94, 19, 1.12], "icon-anchor": "bottom", "icon-allow-overlap": true, "icon-ignore-placement": true, "icon-padding": 1 }} paint={{ "icon-opacity": hasFocusedStore ? 0.78 : ["interpolate", ["linear"], ["zoom"], STORE_ICON_MIN_ZOOM, 0, 15.55, 0.45, 15.8, 0.9, 16, 1] }} />
    <Layer id={STORE_CATEGORY_LABEL_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="symbol" filter={UNCLUSTERED_STORE_FILTER} minzoom={STORE_LABEL_MIN_ZOOM} layout={{ "text-field": ["get", "name"], "text-size": ["interpolate", ["linear"], ["zoom"], STORE_LABEL_MIN_ZOOM, 10.5, 17, 12], "text-anchor": "top", "text-offset": [0, 1.15], "text-max-width": 8, "text-line-height": 1.1, "text-padding": 3, "text-allow-overlap": false, "text-ignore-placement": false }} paint={{ "text-color": "#24392d", "text-halo-color": "rgba(255, 255, 255, 0.94)", "text-halo-width": 1.3, "text-opacity": ["interpolate", ["linear"], ["zoom"], STORE_LABEL_MIN_ZOOM, 0, 16.35, 0.92] }} />
    <Layer id={STORE_POINT_HIT_LAYER_ID} source={STORE_POINT_SOURCE_ID} type="circle" filter={UNCLUSTERED_STORE_FILTER} paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 13, 12, 17, 19], "circle-color": "#000000", "circle-opacity": 0.01 }} />
  </>;
}

export function StorePointSource({ data, selectedFeatureId, densityMode, hasFocusedStore }: { data: ReturnType<typeof createStoreFeatureCollection>; selectedFeatureId: string; densityMode: boolean; hasFocusedStore: boolean }) {
  return <>
    <Source id={STORE_POINT_SOURCE_ID} type="geojson" data={data} cluster clusterMaxZoom={STORE_CLUSTER_MAX_ZOOM} clusterRadius={46} clusterMinPoints={3} maxzoom={18} buffer={64} />
    <StoreClusterLayers />
    <StoreRawPointLayers densityMode={densityMode} hasFocusedStore={hasFocusedStore} selectedFeatureId={selectedFeatureId} />
  </>;
}

export function SelectedStorePointSource({ data }: { data: ReturnType<typeof createStoreFeatureCollection> }) {
  return <>
    <Source id={STORE_SELECTED_POINT_SOURCE_ID} type="geojson" data={data} />
    <Layer id={STORE_SELECTED_HALO_LAYER_ID} source={STORE_SELECTED_POINT_SOURCE_ID} type="circle" paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 13, 17, 20], "circle-color": STORE_COLOR_EXPRESSION, "circle-opacity": 0.3, "circle-stroke-color": "rgba(255, 255, 255, 0.98)", "circle-stroke-width": 2.5, "circle-blur": 0.22 }} />
    <Layer id={STORE_SELECTED_POINT_LAYER_ID} source={STORE_SELECTED_POINT_SOURCE_ID} type="circle" paint={{ "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 8, 17, 12], "circle-color": STORE_COLOR_EXPRESSION, "circle-opacity": 0.98, "circle-stroke-color": "#ffffff", "circle-stroke-width": 3.2 }} />
  </>;
}
