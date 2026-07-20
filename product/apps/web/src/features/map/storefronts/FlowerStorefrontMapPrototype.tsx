import { useState } from "react";
import type { Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import Map, { Layer, Marker, Source } from "react-map-gl/maplibre";

import { flowerStorefrontLocation } from "./flowerStorefrontLocation";
import "maplibre-gl/dist/maplibre-gl.css";
import "./flowerStorefrontMapPrototype.css";

const previewStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: "preview-background",
      type: "background",
      paint: { "background-color": "#e9efe7" },
    },
  ],
};

export function FlowerStorefrontMapPrototype() {
  const [layerStatus, setLayerStatus] = useState("준비 중");

  async function placeStorefront(mapInstance: MapLibreMap) {
    try {
      const { createFlowerStorefrontLayer, flowerStorefrontLayerId } =
        await import("./createFlowerStorefrontLayer");
      if (!mapInstance.getLayer(flowerStorefrontLayerId)) {
        mapInstance.addLayer(createFlowerStorefrontLayer());
      }
      mapInstance.triggerRepaint();
      setLayerStatus("실제 좌표 배치 완료");
    } catch {
      setLayerStatus("3D layer 로딩 실패");
    }
  }

  return (
    <main className="flower-map-prototype">
      <header className="flower-map-prototype-header">
        <div>
          <p>MAP-004 · ACTUAL COORDINATE SLICE</p>
          <h1>꽃 테마 Storefront 실제 지도 배치</h1>
        </div>
        <dl>
          <div>
            <dt>장소</dt>
            <dd>{flowerStorefrontLocation.name}</dd>
          </div>
          <div>
            <dt>근거</dt>
            <dd>{flowerStorefrontLocation.sourceId}</dd>
          </div>
          <div>
            <dt>좌표</dt>
            <dd>
              {flowerStorefrontLocation.longitude}, {flowerStorefrontLocation.latitude}
            </dd>
          </div>
          <div>
            <dt>상태</dt>
            <dd>{layerStatus}</dd>
          </div>
        </dl>
      </header>
      <section className="flower-map-prototype-stage" aria-label="꽃 테마 점포 실제 좌표 지도">
        <Map
          initialViewState={{
            longitude: flowerStorefrontLocation.longitude,
            latitude: flowerStorefrontLocation.latitude,
            zoom: 18.7,
            pitch: 62,
            bearing: -26,
          }}
          mapStyle={previewStyle}
          attributionControl={false}
          onLoad={(event) => void placeStorefront(event.target)}
          dragPan
          scrollZoom
          touchZoomRotate
        >
          <Source
            id="flower-map-data"
            type="geojson"
            data="/map/hongdae.geojson"
            attribution="© OpenStreetMap contributors"
          >
            <Layer
              id="flower-landcover"
              type="fill"
              filter={["==", ["get", "layer"], "landcover"]}
              paint={{ "fill-color": "#bdd8b5", "fill-opacity": 0.9 }}
            />
            <Layer
              id="flower-buildings"
              type="fill"
              filter={["==", ["get", "layer"], "building"]}
              paint={{
                "fill-color": [
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
                "fill-opacity": 0.86,
              }}
            />
            <Layer
              id="flower-roads"
              type="line"
              filter={["==", ["get", "layer"], "road"]}
              layout={{ "line-cap": "round", "line-join": "round" }}
              paint={{
                "line-color": [
                  "match",
                  ["get", "class"],
                  ["primary", "secondary"],
                  "#efc875",
                  "#fffaf0",
                ],
                "line-width": ["interpolate", ["linear"], ["zoom"], 14, 2, 18, 13],
              }}
            />
          </Source>
          <Marker
            longitude={flowerStorefrontLocation.longitude}
            latitude={flowerStorefrontLocation.latitude}
            anchor="bottom-left"
            offset={[42, -36]}
          >
            <div className="flower-map-label">
              <strong>{flowerStorefrontLocation.name}</strong>
              <span>OSM 분류: {flowerStorefrontLocation.sourceCategory}</span>
            </div>
          </Marker>
        </Map>
      </section>
      <footer className="flower-map-prototype-footer">
        지도에서 drag·zoom·rotate하면 Three.js 점포가 실제 좌표에 고정된 채 함께 움직입니다. 모델은
        주변 건물과 비교할 수 있도록 원본 크기(약 4.7m 폭)로 표시합니다.
      </footer>
    </main>
  );
}
