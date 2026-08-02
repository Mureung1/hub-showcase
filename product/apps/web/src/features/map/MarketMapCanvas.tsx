import type { GeoJSONSource, MapLayerMouseEvent } from "maplibre-gl";
import { ChevronRight, MapPinned } from "lucide-react";
import { lazy, Suspense, useMemo, useState, type RefObject } from "react";
import Map, { Layer, Marker, Popup, type MapRef } from "react-map-gl/maplibre";

import { resolveCategoryPresentation } from "../market/categoryPresentation";
import { isTestEnvironment } from "../market/model";
import type { LayerMode, Market, MarketKey, MarketStore } from "../market/types";
import {
  addMissingStyleImageFallback,
  BASE_BUILDING_LAYER_ID,
  BASE_MAP_STYLE_URL,
  hideExternalBuildingLayers,
} from "./baseMap";
import {
  insideSelectedMarketFilter,
  outsideSelectedMarketFilter,
  useMarketBoundaryGeometry,
} from "./marketBoundaryGeometry";
import { getMapPresentationProfile, type MapPresentationMode } from "./mapPresentation";
import { SelectedMarketBoundary } from "./SelectedMarketBoundary";
import "./storeMarkerLod.css";
import { StoreDensityHeatmap } from "./StoreDensityHeatmap";
import {
  STORE_CLUSTER_CIRCLE_LAYER_ID,
  STORE_POINT_HIT_LAYER_ID,
  STORE_POINT_SOURCE_ID,
} from "./stores/storeGeoJson";
import { StorePointLayers } from "./stores/StorePointLayers";
import { SupportedRegionOverlays } from "./SupportedRegionOverlays";
import { storefrontStoreIdentity } from "./storefronts/storefrontObjectField";
import { READY_OVERLAY_REGIONS, type MapBounds } from "./supportedRegions";
import type { SelectedStorefront } from "./storefronts/SelectedStorefrontLayer";

const SELECTED_MARKET_BUILDING_LAYER_ID = `${BASE_BUILDING_LAYER_ID}-selected-market`;

const StorefrontBuildingLayers = lazy(() =>
  import("./storefronts/StorefrontBuildingLayers").then((module) => ({
    default: module.StorefrontBuildingLayers,
  })),
);

function readMapBounds(map: {
  getBounds: () => {
    getWest: () => number;
    getSouth: () => number;
    getEast: () => number;
    getNorth: () => number;
  };
}): MapBounds {
  const bounds = map.getBounds();
  return {
    west: bounds.getWest(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    north: bounds.getNorth(),
  };
}

function handleStoreLayerClick(
  event: MapLayerMouseEvent,
  onSelectStore: (storeKey: string) => void,
  onClearSelection: () => void,
) {
  const clusterFeature = event.features?.find(
    (feature) => feature.layer.id === STORE_CLUSTER_CIRCLE_LAYER_ID,
  );
  if (clusterFeature?.geometry.type === "Point") {
    const rawClusterId = clusterFeature.properties?.cluster_id;
    const clusterId = typeof rawClusterId === "number" ? rawClusterId : Number(rawClusterId);
    const source = event.target.getSource(STORE_POINT_SOURCE_ID) as GeoJSONSource | undefined;
    if (source && Number.isFinite(clusterId)) {
      const center = clusterFeature.geometry.coordinates as [number, number];
      void source
        .getClusterExpansionZoom(clusterId)
        .then((zoom) => {
          event.target.easeTo({
            center,
            zoom: Math.min(zoom, 17.5),
            duration: 450,
            essential: true,
          });
        })
        .catch(() => undefined);
    }
    return;
  }

  const storeFeature = event.features?.find(
    (feature) => feature.layer.id === STORE_POINT_HIT_LAYER_ID,
  );
  const storeKey = storeFeature?.properties?.storeKey;
  if (typeof storeKey === "string") {
    onSelectStore(storeKey);
    return;
  }
  onClearSelection();
}

type MarketMapCanvasProps = {
  market: Market;
  marketKey: MarketKey;
  marketId: string;
  mapRef: RefObject<MapRef | null>;
  onVisibleCenterChange: (center: [number, number]) => void;
  onVisibleBoundsChange: (bounds: MapBounds) => void;
  presentationMode: MapPresentationMode;
  marketTransitionActive: boolean;
  baseBuildingsRendered: boolean;
  layer: LayerMode;
  selectedCategoryName: string;
  boundaryVisible: boolean;
  storesVisible: boolean;
  storefrontBuildings3d: SelectedStorefront[];
  onStorefrontUnavailable: () => void;
  flowPeople: Array<{ longitude: number; latitude: number; delay: number }>;
  activeHour: number;
  activeDemandLabel: string;
  mapStores: MarketStore[];
  selected: MarketStore | null;
  score: number | null;
  onSelectStore: (storeKey: string) => void;
  onClearSelection: () => void;
  visibleSupportedRegion: boolean;
  onEvidenceOpen: () => void;
};

type MapContentsProps = {
  activeDemandLabel: string;
  activeHour: number;
  activeOverlayRegion: (typeof READY_OVERLAY_REGIONS)[number] | undefined;
  baseBuildingsRendered: boolean;
  boundaryVisible: boolean;
  densityStores: MarketStore[];
  effectivePresentationMode: MapPresentationMode;
  flowPeople: Array<{ longitude: number; latitude: number; delay: number }>;
  insideBuildingFilter: ReturnType<typeof insideSelectedMarketFilter>;
  layer: LayerMode;
  market: Market;
  marketId: string;
  marketKey: MarketKey;
  marketTransitionActive: boolean;
  onEvidenceOpen: () => void;
  onSelectStore: (storeKey: string) => void;
  onStorefrontUnavailable: () => void;
  outsideBuildingFilter: ReturnType<typeof outsideSelectedMarketFilter>;
  profile: ReturnType<typeof getMapPresentationProfile>;
  representedStoreIds: Set<string>;
  score: number | null;
  selected: MarketStore | null;
  selectedCategoryName: string;
  selectedDistanceLabel: string;
  selectedPresentation: ReturnType<typeof resolveCategoryPresentation>;
  storefrontObjectHitStores: MarketStore[];
  storePoints: MarketStore[];
  storesVisible: boolean;
  visibleStorefronts: SelectedStorefront[];
};

type SelectedStorePopupProps = Pick<
  MapContentsProps,
  | "market"
  | "onEvidenceOpen"
  | "score"
  | "selected"
  | "selectedDistanceLabel"
  | "selectedPresentation"
>;

function SelectedStorePopup({
  market,
  onEvidenceOpen,
  score,
  selected,
  selectedDistanceLabel,
  selectedPresentation,
}: SelectedStorePopupProps) {
  if (!selected) return null;
  const SelectedIcon = selectedPresentation.icon;
  return (
    <Popup
      longitude={selected.longitude}
      latitude={selected.latitude}
      anchor="bottom-left"
      offset={[26, -35]}
      closeButton={false}
      closeOnClick={false}
      maxWidth="340px"
      className="selected-store-popup"
    >
      <div className={`selected-location theme-${selectedPresentation.tone}`}>
        <span className={`selected-store-icon ${selectedPresentation.tone}`}>
          <SelectedIcon size={18} aria-hidden="true" />
        </span>
        <div className="selected-store-heading">
          <div className="selected-store-heading-copy">
            <div className="selected-store-title-line">
              <b>{selected.name}</b>
              <span className={`selected-store-category-chip ${selectedPresentation.tone}`}>
                {selectedPresentation.label}
              </span>
            </div>
            <small className="selected-store-distance">{selectedDistanceLabel}</small>
          </div>
          {score !== null && (
            <span
              className="selected-store-score"
              title={`${market.name}에서 ${selectedPresentation.label} 업종의 입지 조건을 나타내는 공통 점수`}
            >
              <small>상권·업종 점수</small>
              <strong>{score}점</strong>
            </span>
          )}
        </div>
        <button type="button" onClick={onEvidenceOpen}>
          점수 근거 <ChevronRight size={14} />
        </button>
      </div>
    </Popup>
  );
}

function MapContents({
  activeDemandLabel,
  activeHour,
  activeOverlayRegion,
  baseBuildingsRendered,
  boundaryVisible,
  densityStores,
  effectivePresentationMode,
  flowPeople,
  insideBuildingFilter,
  layer,
  market,
  marketId,
  marketKey,
  marketTransitionActive,
  onEvidenceOpen,
  onSelectStore,
  onStorefrontUnavailable,
  outsideBuildingFilter,
  profile,
  representedStoreIds,
  score,
  selected,
  selectedCategoryName,
  selectedDistanceLabel,
  selectedPresentation,
  storefrontObjectHitStores,
  storePoints,
  storesVisible,
  visibleStorefronts,
}: MapContentsProps) {
  const SelectedIcon = selectedPresentation.icon;
  return (
    <>
      <Layer
        id={BASE_BUILDING_LAYER_ID}
        type="fill-extrusion"
        source="openmaptiles"
        source-layer="building"
        minzoom={14}
        beforeId="boundary_3"
        filter={outsideBuildingFilter}
        layout={{ visibility: baseBuildingsRendered ? "visible" : "none" }}
        paint={{
          "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0],
          "fill-extrusion-color": "hsl(35, 8%, 85%)",
          "fill-extrusion-height": ["to-number", ["get", "render_height"], 8],
          "fill-extrusion-opacity": 0.82,
          "fill-extrusion-vertical-gradient": true,
        }}
      />
      <Layer
        id={SELECTED_MARKET_BUILDING_LAYER_ID}
        type="fill-extrusion"
        source="openmaptiles"
        source-layer="building"
        minzoom={14}
        beforeId="boundary_3"
        filter={insideBuildingFilter}
        layout={{
          visibility: baseBuildingsRendered && profile.localTwinOverlayVisible ? "visible" : "none",
        }}
        paint={{
          "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0],
          "fill-extrusion-color": [
            "step",
            ["to-number", ["get", "render_height"], 8],
            "#f1d6a5",
            7,
            "#b9d8c1",
            11,
            "#a9cfdf",
            16,
            "#e9b9ad",
            24,
            "#d5c3e2",
          ],
          "fill-extrusion-height": ["to-number", ["get", "render_height"], 8],
          "fill-extrusion-opacity": effectivePresentationMode === "storefront3d" ? 0.72 : 0.94,
          "fill-extrusion-vertical-gradient": true,
        }}
      />
      {profile.localTwinOverlayVisible && <SupportedRegionOverlays region={activeOverlayRegion} />}
      <StoreDensityHeatmap
        stores={densityStores}
        visible={effectivePresentationMode === "analysis" && layer === "density" && storesVisible}
      />
      {boundaryVisible && !marketTransitionActive && (
        <SelectedMarketBoundary marketId={marketId} marketKey={marketKey} />
      )}
      <StorePointLayers
        stores={storePoints}
        selected={selected}
        selectedCategoryName={selectedCategoryName}
        visible={storesVisible}
        densityMode={effectivePresentationMode === "analysis" && layer === "density"}
        storefrontMode={effectivePresentationMode === "storefront3d"}
      />
      {storesVisible && profile.storefrontsVisible && (
        <Suspense fallback={null}>
          <StorefrontBuildingLayers
            key={`${marketId}:${selectedCategoryName}`}
            stores={visibleStorefronts}
            onUnavailable={onStorefrontUnavailable}
            onReady={() => undefined}
          />
        </Suspense>
      )}
      {storesVisible &&
        storefrontObjectHitStores.map((store) => (
          <Marker
            key={`storefront-hit-${store.id ?? store.name}`}
            longitude={store.longitude}
            latitude={store.latitude}
            anchor="center"
          >
            <button
              type="button"
              className="storefront-object-hit-target"
              aria-label={`${store.name} 3D 점포 선택`}
              title={`${store.name} · ${store.category}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectStore(store.id ?? store.name);
              }}
            />
          </Marker>
        ))}
      {market.landmarks.map((place) => (
        <Marker
          key={place.name}
          longitude={place.longitude}
          latitude={place.latitude}
          anchor="bottom"
        >
          <span className="landmark-label">{place.name}</span>
        </Marker>
      ))}
      {layer === "demand" &&
        flowPeople.map((person, index) => (
          <Marker
            key={`${activeHour}-${index}`}
            longitude={person.longitude}
            latitude={person.latitude}
            anchor="center"
          >
            <span
              className="flow-person"
              style={{ animationDelay: `${person.delay}s` }}
              aria-label={`${activeDemandLabel} 유동 수요`}
            />
          </Marker>
        ))}
      {effectivePresentationMode === "storefront3d" &&
        selected &&
        !representedStoreIds.has(storefrontStoreIdentity(selected)) && (
          <Marker longitude={selected.longitude} latitude={selected.latitude} anchor="center">
            <span
              className={`selected-store-focus-anchor ${selectedPresentation.tone}`}
              aria-label={`${selected.name} 선택 위치`}
            >
              <SelectedIcon size={20} strokeWidth={2.6} aria-hidden="true" />
            </span>
          </Marker>
        )}
      <SelectedStorePopup
        market={market}
        onEvidenceOpen={onEvidenceOpen}
        score={score}
        selected={selected}
        selectedDistanceLabel={selectedDistanceLabel}
        selectedPresentation={selectedPresentation}
      />
    </>
  );
}

export function MarketMapCanvas({
  market,
  marketKey,
  marketId,
  mapRef,
  onVisibleCenterChange,
  onVisibleBoundsChange,
  presentationMode,
  marketTransitionActive,
  baseBuildingsRendered,
  layer,
  selectedCategoryName,
  boundaryVisible,
  storesVisible,
  storefrontBuildings3d,
  onStorefrontUnavailable,
  flowPeople,
  activeHour,
  activeDemandLabel,
  mapStores,
  selected,
  score,
  onSelectStore,
  onClearSelection,
  visibleSupportedRegion,
  onEvidenceOpen,
}: MarketMapCanvasProps) {
  const effectivePresentationMode = marketTransitionActive ? "flat" : presentationMode;
  const profile = getMapPresentationProfile(effectivePresentationMode);
  const marketBoundaryGeometry = useMarketBoundaryGeometry(marketId, marketKey);
  const activeOverlayRegion = useMemo(
    () => READY_OVERLAY_REGIONS.find((region) => region.label === marketKey),
    [marketKey],
  );
  const outsideBuildingFilter = useMemo(
    () =>
      profile.localTwinOverlayVisible
        ? outsideSelectedMarketFilter(marketBoundaryGeometry)
        : outsideSelectedMarketFilter(null),
    [marketBoundaryGeometry, profile.localTwinOverlayVisible],
  );
  const insideBuildingFilter = useMemo(
    () =>
      insideSelectedMarketFilter(profile.localTwinOverlayVisible ? marketBoundaryGeometry : null),
    [marketBoundaryGeometry, profile.localTwinOverlayVisible],
  );
  const [mapReady, setMapReady] = useState(false);
  const visibleStorefronts = useMemo(
    () => (profile.storefrontsVisible ? storefrontBuildings3d : []),
    [profile.storefrontsVisible, storefrontBuildings3d],
  );
  const representedStoreIds = useMemo(
    () => new Set(visibleStorefronts.map((store) => store.id)),
    [visibleStorefronts],
  );
  const storefrontObjectHitStores = useMemo(
    () => mapStores.filter((store) => representedStoreIds.has(storefrontStoreIdentity(store))),
    [mapStores, representedStoreIds],
  );
  const densityStores = mapStores;
  const selectedPresentation = resolveCategoryPresentation(selectedCategoryName);
  const selectedDistanceLabel = selected
    ? `${selectedPresentation.label} · 상권 중심에서 ${selected.distance}`
    : "";

  if (isTestEnvironment())
    return <div className="map-fallback">실제 지도는 브라우저 환경에서 표시됩니다.</div>;
  return (
    <div className="live-map" aria-busy={!mapReady}>
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: market.center[0],
          latitude: market.center[1],
          zoom: 15.4,
          ...profile.camera,
        }}
        mapStyle={BASE_MAP_STYLE_URL}
        attributionControl={false}
        dragPan
        scrollZoom
        touchZoomRotate
        interactiveLayerIds={
          storesVisible ? [STORE_CLUSTER_CIRCLE_LAYER_ID, STORE_POINT_HIT_LAYER_ID] : []
        }
        onLoad={(event) => {
          event.target.on("styleimagemissing", addMissingStyleImageFallback);
          hideExternalBuildingLayers(event.target);
          onVisibleCenterChange([event.target.getCenter().lng, event.target.getCenter().lat]);
          onVisibleBoundsChange(readMapBounds(event.target));
        }}
        onIdle={() => setMapReady(true)}
        onStyleData={(event) => hideExternalBuildingLayers(event.target)}
        onClick={(event) => handleStoreLayerClick(event, onSelectStore, onClearSelection)}
        onMouseEnter={(event) => {
          event.target.getCanvas().style.cursor = "pointer";
        }}
        onMouseLeave={(event) => {
          event.target.getCanvas().style.cursor = "";
        }}
        onMoveEnd={(event) => {
          onVisibleCenterChange([event.viewState.longitude, event.viewState.latitude]);
          onVisibleBoundsChange(readMapBounds(event.target));
        }}
      >
        <MapContents
          activeDemandLabel={activeDemandLabel}
          activeHour={activeHour}
          activeOverlayRegion={activeOverlayRegion}
          baseBuildingsRendered={baseBuildingsRendered}
          boundaryVisible={boundaryVisible}
          densityStores={densityStores}
          effectivePresentationMode={effectivePresentationMode}
          flowPeople={flowPeople}
          insideBuildingFilter={insideBuildingFilter}
          layer={layer}
          market={market}
          marketId={marketId}
          marketKey={marketKey}
          marketTransitionActive={marketTransitionActive}
          onEvidenceOpen={onEvidenceOpen}
          onSelectStore={onSelectStore}
          onStorefrontUnavailable={onStorefrontUnavailable}
          outsideBuildingFilter={outsideBuildingFilter}
          profile={profile}
          representedStoreIds={representedStoreIds}
          score={score}
          selected={selected}
          selectedCategoryName={selectedCategoryName}
          selectedDistanceLabel={selectedDistanceLabel}
          selectedPresentation={selectedPresentation}
          storefrontObjectHitStores={storefrontObjectHitStores}
          storePoints={densityStores}
          storesVisible={storesVisible}
          visibleStorefronts={visibleStorefronts}
        />
      </Map>
      {!mapReady && (
        <div className="map-loading-overlay" role="status" aria-live="polite">
          <div className="map-loading-pattern" aria-hidden="true" />
          <div className="map-loading-card">
            <span className="map-loading-icon" aria-hidden="true">
              <MapPinned size={20} />
            </span>
            <span>
              <b>지도를 불러오는 중</b>
              <small>도로와 건물 정보를 준비하고 있습니다.</small>
            </span>
          </div>
        </div>
      )}
      {!visibleSupportedRegion && mapReady && (
        <div className="map-support-status" role="status">
          <b>LocalTwin 분석 지원 범위 밖</b>
          <span>기본 지도는 계속 탐색할 수 있으며 새 분석은 지원 지역에서 시작합니다.</span>
        </div>
      )}
    </div>
  );
}
