import { Layer, Source } from "react-map-gl/maplibre";

import { regionLayerId, regionSourceId } from "./regionLayerIds";
import type { ReadyOverlayRegion } from "./supportedRegions";

type LocalTwinRegionOverlayProps = {
  region: ReadyOverlayRegion;
  buildingsVisible: boolean;
};

export function LocalTwinRegionOverlay({ region, buildingsVisible }: LocalTwinRegionOverlayProps) {
  return (
    <Source
      id={regionSourceId(region.id)}
      type="geojson"
      data={region.overlayDataUrl}
      attribution="© OpenStreetMap contributors"
    >
      <Layer
        id={regionLayerId(region.id, "landcover")}
        type="fill"
        filter={["==", ["get", "layer"], "landcover"]}
        paint={{
          "fill-color": [
            "match",
            ["get", "class"],
            "park",
            "#aad39f",
            "garden",
            "#bddcae",
            "forest",
            "#91c49b",
            "#c7dfb5",
          ],
          "fill-opacity": 0.94,
        }}
      />
      <Layer
        id={regionLayerId(region.id, "water-fill")}
        type="fill"
        filter={["all", ["==", ["get", "layer"], "water"], ["==", ["geometry-type"], "Polygon"]]}
        paint={{ "fill-color": "#9bd2e7", "fill-opacity": 0.9 }}
      />
      <Layer
        id={regionLayerId(region.id, "water-line")}
        type="line"
        filter={["all", ["==", ["get", "layer"], "water"], ["==", ["geometry-type"], "LineString"]]}
        paint={{ "line-color": "#77c4df", "line-width": 3 }}
      />
      <Layer
        id={regionLayerId(region.id, "road-casing")}
        type="line"
        filter={["==", ["get", "layer"], "road"]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": "#c9c7bb",
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            ["match", ["get", "class"], ["primary", "secondary"], 5, 2],
            17,
            ["match", ["get", "class"], ["primary", "secondary"], 22, 10],
          ],
        }}
      />
      <Layer
        id={regionLayerId(region.id, "road")}
        type="line"
        filter={["==", ["get", "layer"], "road"]}
        layout={{ "line-cap": "round", "line-join": "round" }}
        paint={{
          "line-color": [
            "match",
            ["get", "class"],
            ["primary", "secondary"],
            "#f5cf82",
            ["pedestrian", "footway", "path"],
            "#eadfc8",
            "#fffdf7",
          ],
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            ["match", ["get", "class"], ["primary", "secondary"], 4, 1],
            17,
            ["match", ["get", "class"], ["primary", "secondary"], 19, 8],
          ],
        }}
      />
      <Layer
        id={regionLayerId(region.id, "building-3d")}
        type="fill-extrusion"
        minzoom={13}
        filter={["==", ["get", "layer"], "building"]}
        layout={{ visibility: buildingsVisible ? "visible" : "none" }}
        paint={{
          "fill-extrusion-base": ["to-number", ["get", "min_height"], 0],
          "fill-extrusion-height": ["to-number", ["get", "height"], 6.4],
          "fill-extrusion-color": [
            "match",
            ["get", "palette"],
            0,
            "#f1d6a5",
            1,
            "#b9d8c1",
            2,
            "#a9cfdf",
            3,
            "#e9b9ad",
            "#d5c3e2",
          ],
          "fill-extrusion-opacity": 0.96,
          "fill-extrusion-vertical-gradient": true,
        }}
      />
      <Layer
        id={regionLayerId(region.id, "road-label")}
        type="symbol"
        minzoom={14.7}
        filter={["all", ["==", ["get", "layer"], "road"], ["!=", ["get", "name"], ""]]}
        layout={{
          "symbol-placement": "line",
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-max-angle": 35,
          "text-padding": 12,
        }}
        paint={{
          "text-color": "#657168",
          "text-halo-color": "#fffdf7",
          "text-halo-width": 1.4,
        }}
      />
      <Layer
        id={regionLayerId(region.id, "poi-label")}
        type="symbol"
        minzoom={16.1}
        filter={["all", ["==", ["get", "layer"], "poi"], ["!=", ["get", "name"], ""]]}
        layout={{
          "text-field": ["get", "name"],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
          "text-offset": [0, 1.2],
          "text-anchor": "top",
          "text-allow-overlap": false,
        }}
        paint={{
          "text-color": "#34443a",
          "text-halo-color": "#f5f8f3",
          "text-halo-width": 1.2,
        }}
      />
    </Source>
  );
}
