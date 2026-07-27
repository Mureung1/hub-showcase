import { useMemo } from "react";
import { Layer, Source } from "react-map-gl/maplibre";

import type { MarketStore } from "../market/types";
import { DENSITY_HEATMAP_COLOR } from "./densityScale";

type StoreDensityHeatmapProps = {
  stores: MarketStore[];
  visible: boolean;
};

type StoreDensityFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: { id: string };
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
  }>;
};

export function StoreDensityHeatmap({ stores, visible }: StoreDensityHeatmapProps) {
  const data = useMemo<StoreDensityFeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: stores.map((store) => ({
        type: "Feature",
        properties: { id: store.id ?? store.name },
        geometry: {
          type: "Point",
          coordinates: [store.longitude, store.latitude],
        },
      })),
    }),
    [stores],
  );

  if (!visible || stores.length === 0) return null;

  return (
    <Source id="localtwin-store-density" type="geojson" data={data}>
      <Layer
        id="localtwin-store-density-heatmap"
        type="heatmap"
        maxzoom={18}
        paint={{
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 13, 0.75, 17, 1.35],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 13, 20, 17, 42],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.58, 18, 0.82],
          "heatmap-color": DENSITY_HEATMAP_COLOR,
        }}
      />
    </Source>
  );
}
