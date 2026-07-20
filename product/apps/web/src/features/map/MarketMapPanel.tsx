import {
  BarChart3,
  Building2,
  ChevronRight,
  Layers3,
  LocateFixed,
  MapPinned,
  Minus,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  ScanLine,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { LayerMode, MapMode, Market } from "../market/types";

type MarketMapPanelProps = {
  toolbarStart: ReactNode;
  mapBody: ReactNode;
  market: Market;
  mapMode: MapMode;
  onMapModeChange: (mode: MapMode) => void;
  layer: LayerMode;
  onLayerChange: (layer: LayerMode) => void;
  densityLabel: string;
  activeDemandLabel: string;
  activeDemand: number;
  baseBuildingsVisible: boolean;
  onBaseBuildingsVisibleChange: (next: boolean | ((current: boolean) => boolean)) => void;
  mapRef: RefObject<MapRef | null>;
  prefabMode: boolean;
  onPrefabToggle: () => void;
  onCompareOpen: () => void;
  comparisonEnabled: boolean;
  filtersOpen: boolean;
  inspectorOpen: boolean;
  filterOpenButtonRef: RefObject<HTMLButtonElement | null>;
  inspectorOpenButtonRef: RefObject<HTMLButtonElement | null>;
  onFiltersOpen: () => void;
  onInspectorOpen: () => void;
  onSceneOpen: () => void;
};

export function MarketMapPanel({
  toolbarStart,
  mapBody,
  market,
  mapMode,
  onMapModeChange,
  layer,
  onLayerChange,
  densityLabel,
  activeDemandLabel,
  activeDemand,
  baseBuildingsVisible,
  onBaseBuildingsVisibleChange,
  mapRef,
  prefabMode,
  onPrefabToggle,
  onCompareOpen,
  comparisonEnabled,
  filtersOpen,
  inspectorOpen,
  filterOpenButtonRef,
  inspectorOpenButtonRef,
  onFiltersOpen,
  onInspectorOpen,
  onSceneOpen,
}: MarketMapPanelProps) {
  return (
    <section className="map-panel" aria-label="지도와 상권 분포">
      <div className="map-toolbar">
        {toolbarStart}
        <div className="map-toolbar-actions">
          {!filtersOpen && <button ref={filterOpenButtonRef} type="button" className="glass-button panel-open-button" onClick={onFiltersOpen}><PanelLeftOpen size={16} /> 분석 조건 열기</button>}
          {!inspectorOpen && <button ref={inspectorOpenButtonRef} type="button" className="glass-button panel-open-button" onClick={onInspectorOpen}><PanelRightOpen size={16} /> 분석 결과 열기</button>}
          <div className="map-mode-switch" role="group" aria-label="지도 표현 방식">
            <button type="button" className={mapMode === "localtwin" ? "is-selected" : ""} aria-pressed={mapMode === "localtwin"} onClick={() => onMapModeChange("localtwin")}><Layers3 size={15} /> <span>LocalTwin</span></button>
            <button type="button" className={mapMode === "original" ? "is-selected" : ""} aria-pressed={mapMode === "original"} onClick={() => onMapModeChange("original")}><MapPinned size={15} /> <span>실제 지도</span></button>
          </div>
          <button type="button" className="glass-button" onClick={() => onLayerChange(layer === "density" ? "demand" : "density")}><Layers3 size={16} /> {densityLabel}</button>
        </div>
      </div>
      <button type="button" className="scene-entry-button" onClick={onSceneOpen}><ScanLine size={16} /><span>관평동 3D 장소</span><small>촬영 전</small><ChevronRight className="scene-entry-chevron" size={15} /></button>
      {mapBody}
      <div className="map-legend"><p>{layer === "density" ? "동일 업종 밀도" : "대표 시간대 수요"}</p><span><i className="low" /> 낮음</span><span><i className="mid" /> 보통</span><span><i className="high" /> 높음</span></div>
      <div className="map-attribution">{mapMode === "localtwin" ? "OpenFreeMap · LocalTwin map data overlay" : "OpenFreeMap"} · © OpenStreetMap contributors</div>
      {layer === "demand" && <div className="flow-card"><span>시간대 유동 수요</span><b>{activeDemandLabel} · {activeDemand}/100</b><small>아이콘 수는 상대 수요 비율을 표시합니다.</small></div>}
      <div className="map-controls">
        <button type="button" title="현재 상권으로 이동" onClick={() => mapRef.current?.flyTo({ center: market.center, zoom: 15.4, pitch: 38, bearing: -18, essential: true })}><LocateFixed size={18} /></button>
        <button type="button" className={baseBuildingsVisible ? "is-active" : ""} title="건물 레이어 표시" aria-label="건물 레이어 표시" aria-pressed={baseBuildingsVisible} onClick={() => onBaseBuildingsVisibleChange((current) => !current)}><Building2 size={17} /></button>
        <button type="button" title="확대" onClick={() => mapRef.current?.zoomIn()}><Plus size={18} /></button>
        <button type="button" title="축소" onClick={() => mapRef.current?.zoomOut()}><Minus size={18} /></button>
        <button type="button" className={prefabMode ? "three-d is-active" : "three-d"} aria-pressed={prefabMode} onClick={onPrefabToggle}>3D</button>
      </div>
      <button type="button" className="compare-cta" disabled={!comparisonEnabled} title={comparisonEnabled ? undefined : "전체 지원 업종에서만 상권 비교를 제공합니다."} onClick={onCompareOpen}><BarChart3 size={17} /> 상권 비교 열기</button>
    </section>
  );
}
