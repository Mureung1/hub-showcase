import { ChevronDown } from "lucide-react";
import { lazy, Suspense, type RefObject } from "react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";

import { AnalysisLocationControls } from "../analysis/AnalysisLocationControls";
import type { AnalysisMoveMode, AnalysisRadius } from "../analysis/types";
import { categoryClass, isTestEnvironment } from "../market/model";
import type { AnalysisScope, LayerMode, MapMode, Market, MarketStore } from "../market/types";
import {
  addMissingStyleImageFallback,
  BASE_BUILDING_LAYER_ID,
  BASE_MAP_STYLE_URL,
} from "./baseMap";
import { SelectedMarketBoundary } from "./SelectedMarketBoundary";
import { SupportedRegionOverlays } from "./SupportedRegionOverlays";
import type { SelectedStorefront } from "./storefronts/SelectedStorefrontLayer";

const SelectedStorefrontLayer = lazy(() =>
  import("./storefronts/SelectedStorefrontLayer").then((module) => ({
    default: module.SelectedStorefrontLayer,
  })),
);

type MarketMapCanvasProps = {
  market: Market;
  marketId: string;
  mapRef: RefObject<MapRef | null>;
  onVisibleCenterChange: (center: [number, number]) => void;
  mapMode: MapMode;
  baseBuildingsVisible: boolean;
  baseBuildingsRendered: boolean;
  analysisScope: AnalysisScope;
  circle: {
    type: "Feature";
    properties: Record<string, never>;
    geometry: { type: "Polygon"; coordinates: number[][][] };
  };
  layer: LayerMode;
  boundaryVisible: boolean;
  storesVisible: boolean;
  selectedStorefront3d: SelectedStorefront | null;
  onStorefrontUnavailable: () => void;
  analysisCenter: [number, number];
  radius: AnalysisRadius;
  flowPeople: Array<{ longitude: number; latitude: number; delay: number }>;
  activeHour: number;
  activeDemandLabel: string;
  mapStores: MarketStore[];
  selected: MarketStore | null;
  score: number | null;
  prefabMode: boolean;
  onSelectStore: (name: string) => void;
  visibleSupportedRegion: boolean;
  analysisMoveMode: AnalysisMoveMode;
  canConfirmAnalysisMove: boolean;
  onStartAnalysisMove: () => void;
  onConfirmAnalysisMove: () => void;
  onCancelAnalysisMove: () => void;
  onEvidenceOpen: () => void;
};

function StoreMarker({
  store,
  selectedName,
  prefabMode,
  onSelect,
}: {
  store: MarketStore;
  selectedName: string | null;
  prefabMode: boolean;
  onSelect: (name: string) => void;
}) {
  const isSelected = selectedName === store.name;
  const isPrefab = prefabMode && isSelected;
  const icon =
    store.category === "카페" ? "☕" : store.category === "음식점" ? "⌁" : store.category === "베이커리" ? "✦" : "+";
  return (
    <Marker longitude={store.longitude} latitude={store.latitude} anchor="bottom">
      <button
        type="button"
        aria-label={`${store.name} 후보 보기`}
        className={
          isPrefab
            ? `prefab-building ${categoryClass(store.category)} ${isSelected ? "is-selected" : ""}`
            : `map-marker ${categoryClass(store.category)} ${isSelected ? "is-selected" : ""}`
        }
        onClick={() => onSelect(store.name)}
      >
        {isPrefab ? (
          <>
            <span className="prefab-shadow" /><span className="prefab-side" />
            <span className="prefab-face"><i>{icon}</i></span><span className="prefab-awning" />
            <span className="prefab-door" /><span className="prefab-sign" />
            <span className="prefab-planter" /><span className="prefab-roof" />
            <span className="prefab-chimney" />
          </>
        ) : <span>{icon}</span>}
      </button>
    </Marker>
  );
}

export function MarketMapCanvas({
  market, marketId, mapRef, onVisibleCenterChange, mapMode, baseBuildingsVisible,
  baseBuildingsRendered, analysisScope, circle, layer, boundaryVisible, storesVisible,
  selectedStorefront3d, onStorefrontUnavailable, analysisCenter, radius, flowPeople,
  activeHour, activeDemandLabel, mapStores, selected, score, prefabMode, onSelectStore,
  visibleSupportedRegion, analysisMoveMode, canConfirmAnalysisMove, onStartAnalysisMove,
  onConfirmAnalysisMove, onCancelAnalysisMove, onEvidenceOpen,
}: MarketMapCanvasProps) {
  if (isTestEnvironment()) return <div className="map-fallback">실제 지도는 브라우저 환경에서 표시됩니다.</div>;
  return (
    <div className="live-map">
      <Map
        ref={mapRef}
        initialViewState={{ longitude: market.center[0], latitude: market.center[1], zoom: 15.4, pitch: 38, bearing: -18 }}
        mapStyle={BASE_MAP_STYLE_URL}
        attributionControl={false}
        dragPan scrollZoom touchZoomRotate
        onLoad={(event) => event.target.on("styleimagemissing", addMissingStyleImageFallback)}
        onMove={(event) => onVisibleCenterChange([event.viewState.longitude, event.viewState.latitude])}
      >
        <Layer id={BASE_BUILDING_LAYER_ID} type="fill-extrusion" source="openmaptiles" source-layer="building" minzoom={14} beforeId="boundary_3" layout={{ visibility: baseBuildingsRendered ? "visible" : "none" }} paint={{ "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0], "fill-extrusion-color": "hsl(35, 8%, 85%)", "fill-extrusion-height": ["to-number", ["get", "render_height"], 8], "fill-extrusion-opacity": 0.8, "fill-extrusion-vertical-gradient": true }} />
        {mapMode === "localtwin" && <SupportedRegionOverlays buildingsVisible={baseBuildingsVisible} />}
        {analysisScope === "radius" && <Source id="analysis-area" type="geojson" data={circle}><Layer id="analysis-area-fill" type="fill" paint={{ "fill-color": layer === "density" ? "#4fa76a" : "#4d8fdc", "fill-opacity": 0.14 }} /><Layer id="analysis-area-line" type="line" paint={{ "line-color": "#ffffff", "line-width": 2.4, "line-opacity": 0.96 }} /></Source>}
        {boundaryVisible && <SelectedMarketBoundary marketId={marketId} />}
        {storesVisible && selectedStorefront3d && <Suspense fallback={null}><SelectedStorefrontLayer store={selectedStorefront3d} onUnavailable={onStorefrontUnavailable} /></Suspense>}
        {analysisScope === "radius" && <Marker longitude={analysisCenter[0]} latitude={analysisCenter[1]} anchor="center"><span className={selectedStorefront3d ? "analysis-center is-storefront-clear" : "analysis-center"}><span>{radius}m</span></span></Marker>}
        {market.landmarks.map((place) => <Marker key={place.name} longitude={place.longitude} latitude={place.latitude} anchor="bottom"><span className="landmark-label">{place.name}</span></Marker>)}
        {layer === "demand" && flowPeople.map((person, index) => <Marker key={`${activeHour}-${index}`} longitude={person.longitude} latitude={person.latitude} anchor="center"><span className="flow-person" style={{ animationDelay: `${person.delay}s` }} aria-label={`${activeDemandLabel} 유동 수요`} /></Marker>)}
        {storesVisible && mapStores.map((store) => <StoreMarker key={store.id ?? `${store.name}:${store.longitude}:${store.latitude}`} store={store} selectedName={selected?.name ?? null} prefabMode={prefabMode} onSelect={onSelectStore} />)}
        {selected && <Marker longitude={selected.longitude} latitude={selected.latitude} anchor="bottom-left" offset={[46, -56]}><div className="selected-location"><span className="pin-head">{score}</span><div><b>{selected.name}</b><small>{selected.category} · {selected.distance}</small><button type="button" onClick={onEvidenceOpen}>근거 보기 <ChevronDown size={14} /></button></div></div></Marker>}
      </Map>
      {!visibleSupportedRegion && <div className="map-support-status" role="status"><b>LocalTwin 분석 지원 범위 밖</b><span>기본 지도는 계속 탐색할 수 있으며 새 분석은 지원 지역에서 시작합니다.</span></div>}
      {analysisScope === "radius" && <AnalysisLocationControls mode={analysisMoveMode} canConfirm={canConfirmAnalysisMove} onStart={onStartAnalysisMove} onConfirm={onConfirmAnalysisMove} onCancel={onCancelAnalysisMove} />}
    </div>
  );
}
