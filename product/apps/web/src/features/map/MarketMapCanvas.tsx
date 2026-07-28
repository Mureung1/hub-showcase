import {
  BedDouble,
  ChevronRight,
  Coffee,
  Dumbbell,
  GraduationCap,
  Scissors,
  Shirt,
  Store,
  Target,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type RefObject } from "react";
import Map, { Layer, Marker, Popup, type MapRef } from "react-map-gl/maplibre";

import { categoryClass, isTestEnvironment } from "../market/model";
import type { LayerMode, Market, MarketStore } from "../market/types";
import {
  addMissingStyleImageFallback,
  BASE_BUILDING_LAYER_ID,
  BASE_MAP_STYLE_URL,
  hideExternalBuildingLayers,
} from "./baseMap";
import { getMapPresentationProfile, type MapPresentationMode } from "./mapPresentation";
import { SelectedMarketBoundary } from "./SelectedMarketBoundary";
import { groupStoreMarkers, STORE_MARKER_DETAIL_ZOOM } from "./storeMarkerLod";
import "./storeMarkerLod.css";
import { StoreDensityHeatmap } from "./StoreDensityHeatmap";
import { SupportedRegionOverlays } from "./SupportedRegionOverlays";
import type { MapBounds } from "./supportedRegions";
import type { SelectedStorefront } from "./storefronts/SelectedStorefrontLayer";
import { loadReplacementBuildingFilter } from "./storefronts/replacementBuildingFilter";

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
  const Icon = markerIcon(store.category);
  const label =
    count > 1
      ? `${store.category} 점포 ${count}개 묶음 보기`
      : `${store.name} 후보 보기`;
  return (
    <Marker longitude={store.longitude} latitude={store.latitude} anchor="bottom">
      <button
        type="button"
        aria-label={label}
        title={count > 1 ? `${store.category} 점포 ${count}개` : `${store.name} · ${store.category}`}
        className={
          isPrefab
            ? `prefab-building ${categoryClass(store.category)} ${isSelected ? "is-selected" : ""}`
            : [
                "map-marker",
                categoryClass(store.category),
                isSelected ? "is-selected" : "",
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

function markerIcon(category: string): LucideIcon {
  if (category.includes("카페") || category.includes("커피")) return Coffee;
  if (
    category.includes("미용") ||
    category.includes("헤어") ||
    category.includes("네일") ||
    category.includes("피부관리")
  )
    return Scissors;
  if (
    category.includes("의류") ||
    category.includes("의복") ||
    category.includes("패션") ||
    category.includes("신발")
  )
    return Shirt;
  if (category.includes("학원") || category.includes("교습") || category.includes("교육원"))
    return GraduationCap;
  if (
    category.includes("숙박") ||
    category.includes("호텔") ||
    category.includes("모텔") ||
    category.includes("여관")
  )
    return BedDouble;
  if (
    category.includes("체육") ||
    category.includes("헬스") ||
    category.includes("피트니스") ||
    category.includes("스포츠") ||
    category.includes("요가") ||
    category.includes("필라테스")
  )
    return Dumbbell;
  return Store;
}

export function MarketMapCanvas({
  market,
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
  const visibleStorefronts = profile.storefrontsVisible ? storefrontBuildings3d : [];
  const [zoom, setZoom] = useState(15.4);
  const [readyStorefrontIds, setReadyStorefrontIds] = useState<Set<string>>(() => new Set());
  const [baseBuildingFilter, setBaseBuildingFilter] =
    useState<Awaited<ReturnType<typeof loadReplacementBuildingFilter>>>(undefined);
  const storefrontKey = `${presentationMode}:${visibleStorefronts.map((store) => store.id).join(",")}`;
  const densityStores = useMemo(
    () =>
      mapStores.filter(
        (store) =>
          store.category === selectedCategoryName || store.category.includes(selectedCategoryName),
      ),
    [mapStores, selectedCategoryName],
  );
  const readyStorefronts = useMemo(
    () => visibleStorefronts.filter((store) => readyStorefrontIds.has(store.id)),
    [readyStorefrontIds, visibleStorefronts],
  );
  const markerGroups = useMemo(
    () => groupStoreMarkers(mapStores, zoom, selected?.name ?? null),
    [mapStores, selected?.name, zoom],
  );

  useEffect(() => {
    setReadyStorefrontIds(new Set());
    setBaseBuildingFilter(undefined);
  }, [storefrontKey]);

  useEffect(() => {
    let active = true;
    if (readyStorefronts.length === 0) {
      setBaseBuildingFilter(undefined);
      return () => {
        active = false;
      };
    }
    void loadReplacementBuildingFilter(readyStorefronts)
      .then((filter) => {
        if (active) setBaseBuildingFilter(filter);
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.warn("LocalTwin base building replacement filter", error);
        if (active) setBaseBuildingFilter(undefined);
      });
    return () => {
      active = false;
    };
  }, [readyStorefronts]);

  const hiddenOverlayBuildingIds = readyStorefronts.flatMap((store) =>
    store.building ? [store.building.id] : [],
  );
  const SelectedIcon = selected ? markerIcon(selected.category) : Coffee;

  if (isTestEnvironment())
    return <div className="map-fallback">실제 지도는 브라우저 환경에서 표시됩니다.</div>;
  return (
    <div className="live-map">
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
          filter={baseBuildingFilter}
          layout={{ visibility: baseBuildingsRendered ? "visible" : "none" }}
          paint={{
            "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0],
            "fill-extrusion-color": "hsl(35, 8%, 85%)",
            "fill-extrusion-height": ["to-number", ["get", "render_height"], 8],
            "fill-extrusion-opacity": 0.8,
            "fill-extrusion-vertical-gradient": true,
          }}
        />
        {profile.localTwinOverlayVisible && (
          <SupportedRegionOverlays
            buildingsVisible={profile.coloredBuildingsVisible}
            hiddenBuildingIds={hiddenOverlayBuildingIds}
          />
        )}
        <StoreDensityHeatmap
          stores={densityStores}
          visible={presentationMode === "analysis" && layer === "density" && storesVisible}
        />
        {boundaryVisible && <SelectedMarketBoundary marketId={marketId} />}
        {storesVisible && visibleStorefronts.length > 0 && (
          <Suspense fallback={null}>
            <StorefrontBuildingLayers
              stores={visibleStorefronts}
              onUnavailable={onStorefrontUnavailable}
              onReady={(storeId) =>
                setReadyStorefrontIds((current) =>
                  current.has(storeId) ? current : new Set(current).add(storeId),
                )
              }
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
            <div className="selected-location">
              <span className="selected-store-icon">
                <SelectedIcon size={18} aria-hidden="true" />
              </span>
              <div className="selected-store-heading">
                <div>
                  <b>{selected.name}</b>
                  <small>
                    {selected.category} · {selected.distance}
                  </small>
                </div>
                <strong title="선택 점포가 속한 상권의 입지 점수">
                  {score === null ? "분석 중" : `${score}점`}
                </strong>
              </div>
              <div className="selected-store-factors">
                <span>
                  <UsersRound size={13} aria-hidden="true" /> {market.footfall}
                </span>
                <span>
                  <Target size={13} aria-hidden="true" /> 경쟁 {sameCategoryCount}개
                </span>
              </div>
              <button type="button" onClick={onEvidenceOpen}>
                점수 근거 보기 <ChevronRight size={14} />
              </button>
            </div>
          </Popup>
        )}
      </Map>
      {!visibleSupportedRegion && (
        <div className="map-support-status" role="status">
          <b>LocalTwin 분석 지원 범위 밖</b>
          <span>기본 지도는 계속 탐색할 수 있으며 새 분석은 지원 지역에서 시작합니다.</span>
        </div>
      )}
    </div>
  );
}
