import { ChevronRight, MapPinned, Target, UsersRound } from "lucide-react";
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
import {
  groupStoreMarkers,
  isStoreMarkerDeemphasized,
  STORE_MARKER_DETAIL_ZOOM,
} from "./storeMarkerLod";
import "./storeMarkerLod.css";
import { StoreDensityHeatmap } from "./StoreDensityHeatmap";
import { SupportedRegionOverlays } from "./SupportedRegionOverlays";
import { READY_OVERLAY_REGIONS, type MapBounds } from "./supportedRegions";
import type { SelectedStorefront } from "./storefronts/SelectedStorefrontLayer";

const DENSITY_MARKER_MIN_ZOOM = 15.7;
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

type MarketMapCanvasProps = {
  market: Market;
  marketKey: MarketKey;
  marketId: string;
  mapRef: RefObject<MapRef | null>;
  onVisibleCenterChange: (center: [number, number]) => void;
  onVisibleBoundsChange: (bounds: MapBounds) => void;
  presentationMode: MapPresentationMode;
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
  sameCategoryCount: number;
  onSelectStore: (name: string) => void;
  visibleSupportedRegion: boolean;
  onEvidenceOpen: () => void;
};

function StoreMarker({
  store,
  selectedName,
  prefabMode,
  detailed,
  count,
  onSelect,
}: {
  store: MarketStore;
  selectedName: string | null;
  prefabMode: boolean;
  detailed: boolean;
  count: number;
  onSelect: (name: string) => void;
}) {
  const isSelected = selectedName === store.name;
  const isPrefab = prefabMode && isSelected && count === 1 && !detailed;
  const isDeemphasized = isStoreMarkerDeemphasized(
    store,
    selectedName,
    prefabMode ? "storefront3d" : "analysis",
  );
  const { icon: Icon, tone, label: groupLabel } = resolveCategoryPresentation(store.category);
  const label =
    count > 1 ? `${groupLabel} 점포 ${count}개 묶음 보기` : `${store.name} 후보 보기`;
  return (
    <Marker longitude={store.longitude} latitude={store.latitude} anchor="bottom">
      <button
        type="button"
        aria-label={label}
        title={count > 1 ? `${groupLabel} 점포 ${count}개` : `${store.name} · ${store.category}`}
        className={
          isPrefab
            ? `prefab-building ${tone} ${isSelected ? "is-selected" : ""}`
            : [
                "map-marker",
                tone,
                isSelected ? "is-selected" : "",
                isDeemphasized ? "is-deemphasized" : "",
                detailed ? "is-detailed" : "is-compact",
                count > 1 ? "is-clustered" : "",
                prefabMode ? "is-storefront-fallback" : "",
              ]
                .filter(Boolean)
                .join(" ")
        }
        onClick={() => onSelect(store.name)}
      >
        {isPrefab ? (
          <>
            <span className="prefab-shadow" />
            <span className="prefab-side" />
            <span className="prefab-face">
              <i>
                <Icon size={10} strokeWidth={2.5} />
              </i>
            </span>
            <span className="prefab-awning" />
            <span className="prefab-door" />
            <span className="prefab-sign" />
            <span className="prefab-planter" />
            <span className="prefab-roof" />
            <span className="prefab-chimney" />
          </>
        ) : (
          <>
            <span>
              <Icon size={detailed ? 21 : 16} strokeWidth={2.5} />
            </span>
            {count > 1 && <small className="store-marker-count">{count}</small>}
          </>
        )}
      </button>
    </Marker>
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
  sameCategoryCount,
  onSelectStore,
  visibleSupportedRegion,
  onEvidenceOpen,
}: MarketMapCanvasProps) {
  const profile = getMapPresentationProfile(presentationMode);
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
    () => insideSelectedMarketFilter(profile.localTwinOverlayVisible ? marketBoundaryGeometry : null),
    [marketBoundaryGeometry, profile.localTwinOverlayVisible],
  );
  const visibleStorefronts = useMemo(
    () => (profile.storefrontsVisible ? storefrontBuildings3d : []),
    [profile.storefrontsVisible, storefrontBuildings3d],
  );
  const representedStoreIds = useMemo(
    () => new Set(visibleStorefronts.map((store) => store.id)),
    [visibleStorefronts],
  );
  const markerStores = useMemo(
    () =>
      profile.storefrontsVisible
        ? mapStores.filter((store) => !representedStoreIds.has(store.id ?? store.name))
        : mapStores,
    [mapStores, profile.storefrontsVisible, representedStoreIds],
  );
  const [zoom, setZoom] = useState(15.4);
  const [mapReady, setMapReady] = useState(false);
  const densityStores = useMemo(
    () =>
      mapStores.filter(
        (store) =>
          store.category === selectedCategoryName || store.category.includes(selectedCategoryName),
      ),
    [mapStores, selectedCategoryName],
  );
  const markerGroups = useMemo(
    () =>
      groupStoreMarkers(
        markerStores,
        zoom,
        selected?.name ?? null,
        profile.storefrontsVisible ? "storefront3d" : "analysis",
      ),
    [markerStores, profile.storefrontsVisible, selected?.name, zoom],
  );
  const densityMarkersVisible =
    presentationMode !== "analysis" || layer !== "density" || zoom >= DENSITY_MARKER_MIN_ZOOM;
  const selectedPresentation = resolveCategoryPresentation(
    selected?.category ?? selectedCategoryName,
  );
  const SelectedIcon = selectedPresentation.icon;
  const footfallLabel = market.footfall.includes("조회 중")
    ? "유동인구 불러오는 중"
    : `유동인구 ${market.footfall}`;

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
        onLoad={(event) => {
          event.target.on("styleimagemissing", addMissingStyleImageFallback);
          hideExternalBuildingLayers(event.target);
          setZoom(event.target.getZoom());
          onVisibleBoundsChange(readMapBounds(event.target));
        }}
        onIdle={() => setMapReady(true)}
        onStyleData={(event) => hideExternalBuildingLayers(event.target)}
        onMove={(event) => {
          setZoom(event.viewState.zoom);
          onVisibleCenterChange([event.viewState.longitude, event.viewState.latitude]);
        }}
        onMoveEnd={(event) => onVisibleBoundsChange(readMapBounds(event.target))}
      >
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
            visibility:
              baseBuildingsRendered && profile.localTwinOverlayVisible ? "visible" : "none",
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
            "fill-extrusion-opacity": presentationMode === "storefront3d" ? 0.9 : 0.94,
            "fill-extrusion-vertical-gradient": true,
          }}
        />
        {profile.localTwinOverlayVisible && <SupportedRegionOverlays region={activeOverlayRegion} />}
        <StoreDensityHeatmap
          stores={densityStores}
          visible={presentationMode === "analysis" && layer === "density" && storesVisible}
        />
        {boundaryVisible && <SelectedMarketBoundary marketId={marketId} marketKey={marketKey} />}
        {storesVisible && visibleStorefronts.length > 0 && (
          <Suspense fallback={null}>
            <StorefrontBuildingLayers
              stores={visibleStorefronts}
              onUnavailable={onStorefrontUnavailable}
              onReady={() => undefined}
            />
          </Suspense>
        )}
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
        {storesVisible &&
          densityMarkersVisible &&
          markerGroups.map(({ store, count }) => (
            <StoreMarker
              key={`${store.id ?? `${store.name}:${store.longitude}:${store.latitude}`}:${count}`}
              store={store}
              selectedName={selected?.name ?? null}
              prefabMode={profile.storefrontsVisible}
              detailed={zoom >= STORE_MARKER_DETAIL_ZOOM}
              count={count}
              onSelect={onSelectStore}
            />
          ))}
        {presentationMode === "storefront3d" && selected && (
          <Marker longitude={selected.longitude} latitude={selected.latitude} anchor="center">
            <span
              className={`selected-store-focus-anchor ${selectedPresentation.tone}`}
              aria-label={`${selected.name} 선택 위치`}
            >
              <SelectedIcon size={20} strokeWidth={2.6} aria-hidden="true" />
            </span>
          </Marker>
        )}
        {selected && (
          <Popup
            longitude={selected.longitude}
            latitude={selected.latitude}
            anchor="bottom-left"
            offset={[26, -35]}
            closeButton={false}
            closeOnClick={false}
            className="selected-store-popup"
          >
            <div className={`selected-location theme-${selectedPresentation.tone}`}>
              <span className={`selected-store-icon ${selectedPresentation.tone}`}>
                <SelectedIcon size={18} aria-hidden="true" />
              </span>
              <div className="selected-store-heading">
                <div>
                  <b>{selected.name}</b>
                  <span className={`selected-store-category-chip ${selectedPresentation.tone}`}>
                    {selectedPresentation.label}
                  </span>
                  <small>
                    {selected.category === selectedPresentation.label
                      ? selected.distance
                      : `${selected.category} · ${selected.distance}`}
                  </small>
                </div>
                <span
                  className={`selected-store-score ${score === null ? "is-loading" : ""}`}
                  title="선택 점포가 속한 상권의 입지 점수"
                >
                  <small>입지 점수</small>
                  <strong>{score === null ? "계산 중" : `${score}점`}</strong>
                </span>
              </div>
              <div className="selected-store-factors">
                <span>
                  <UsersRound size={13} aria-hidden="true" /> {footfallLabel}
                </span>
                <span>
                  <Target size={13} aria-hidden="true" /> 같은 업종 {sameCategoryCount}개
                </span>
              </div>
              <button type="button" onClick={onEvidenceOpen}>
                점수 근거 보기 <ChevronRight size={14} />
              </button>
            </div>
          </Popup>
        )}
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
