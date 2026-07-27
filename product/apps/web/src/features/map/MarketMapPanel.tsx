// liquidglass Repo
import LiquidGlass from "liquid-glass-react";

import {
  BarChart3,
  Building2,
  Layers3,
  LocateFixed,
  MapPinned,
  Minus,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import type { MapRef } from "react-map-gl/maplibre";

import type { LayerMode, Market } from "../market/types";
import "./MapBottomDock.css";
import { getMapPresentationProfile, type MapPresentationMode } from "./mapPresentation";

type MarketMapPanelProps = {
  toolbarStart: ReactNode;
  mapBody: ReactNode;
  bottomMetrics: ReactNode;
  market: Market;
  presentationMode: MapPresentationMode;
  onPresentationModeChange: (mode: MapPresentationMode) => void;
  layer: LayerMode;
  onLayerChange: (layer: LayerMode) => void;
  densityLabel: string;
  activeDemandLabel: string;
  activeDemand: number;
  mapRef: RefObject<MapRef | null>;
  onCompareOpen: () => void;
  comparisonEnabled: boolean;
  filtersOpen: boolean;
  inspectorOpen: boolean;
  filterOpenButtonRef: RefObject<HTMLButtonElement | null>;
  inspectorOpenButtonRef: RefObject<HTMLButtonElement | null>;
  onFiltersOpen: () => void;
  onInspectorOpen: () => void;
};

type SidePanelTriggerProps = {
  side: "left" | "right";
  buttonRef: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
  icon: ReactNode;
  label: ReactNode;
  ariaLabel: string;
  title: string;
};

function SidePanelTrigger({
  side,
  buttonRef,
  onOpen,
  icon,
  label,
  ariaLabel,
  title,
}: SidePanelTriggerProps) {
  return (
    <LiquidGlass
      mode="prominent"
      displacementScale={30}
      blurAmount={0.035}
      saturation={145}
      aberrationIntensity={1.2}
      elasticity={0.24}
      cornerRadius={20}
      padding="0"
      onClick={onOpen}
      style={{
        position: "absolute",
        zIndex: 20,
        top: "50%",
        left: side === "left" ? "33px" : "calc(100% - 33px)",
        display: "block",
      }}
    >
      <button ref={buttonRef} type="button" className="side-panel-trigger" aria-label={ariaLabel} title={title}>
        {icon}
        <span>{label}</span>
      </button>
    </LiquidGlass>
  );
}

export function MarketMapPanel({
  toolbarStart,
  mapBody,
  bottomMetrics,
  market,
  presentationMode,
  onPresentationModeChange,
  layer,
  onLayerChange,
  densityLabel,
  activeDemandLabel,
  activeDemand,
  mapRef,
  onCompareOpen,
  comparisonEnabled,
  filtersOpen,
  inspectorOpen,
  filterOpenButtonRef,
  inspectorOpenButtonRef,
  onFiltersOpen,
  onInspectorOpen,
}: MarketMapPanelProps) {
  const camera = getMapPresentationProfile(presentationMode).camera;

  return (
    <section className="map-panel" aria-label="지도와 상권 분포">
      <div className="map-toolbar">
        {toolbarStart}
        <div className="map-toolbar-actions">
          <div className="map-mode-switch" role="group" aria-label="지도 표현 방식">
            <button
              type="button"
              className={presentationMode === "flat" ? "is-selected" : ""}
              aria-pressed={presentationMode === "flat"}
              onClick={() => onPresentationModeChange("flat")}
            >
              <MapPinned size={15} /> <span>실제 지도</span>
            </button>
            <button
              type="button"
              className={presentationMode === "analysis" ? "is-selected" : ""}
              aria-pressed={presentationMode === "analysis"}
              onClick={() => {
                onPresentationModeChange("analysis");
                onLayerChange("density");
              }}
            >
              <Layers3 size={15} /> <span>{densityLabel}</span>
            </button>
            <button
              type="button"
              className={presentationMode === "storefront3d" ? "is-selected" : ""}
              aria-pressed={presentationMode === "storefront3d"}
              onClick={() => onPresentationModeChange("storefront3d")}
            >
              <Building2 size={15} /> <span>3D 점포</span>
            </button>
          </div>
        </div>
      </div>

      {mapBody}

      {!filtersOpen && (
        <SidePanelTrigger
          side="left"
          buttonRef={filterOpenButtonRef}
          onOpen={onFiltersOpen}
          icon={<PanelLeftOpen size={19} />}
          label={<><span>분석</span><br /><span>설정</span></>}
          ariaLabel="분석 설정 패널 열기"
          title="분석 설정 열기"
        />
      )}

      {!inspectorOpen && (
        <SidePanelTrigger
          side="right"
          buttonRef={inspectorOpenButtonRef}
          onOpen={onInspectorOpen}
          icon={<PanelRightOpen size={19} />}
          label={<><span>분석</span><br /><span>결과</span></>}
          ariaLabel="분석 결과 패널 열기"
          title="분석 결과 열기"
        />
      )}

      <div className="map-legend">
        <p>
          {layer === "density"
            ? "선택 업종 점포가 상대적으로 모인 정도"
            : "선택 시간대의 상대 유동 수요"}
        </p>
        <span><i className="low" /> 낮음</span>
        <span><i className="mid" /> 보통</span>
        <span><i className="high" /> 높음</span>
      </div>

      {layer === "demand" && (
        <div className="flow-card">
          <span>시간대 유동 수요</span>
          <b>{activeDemandLabel} · {activeDemand}/100</b>
          <small>아이콘 수는 상대 수요 비율을 표시합니다.</small>
        </div>
      )}

      <div className="map-controls" aria-label="지도 조작">
        <button
          type="button"
          title="현재 상권으로 이동"
          aria-label="현재 상권으로 이동"
          onClick={() =>
            mapRef.current?.flyTo({
              center: market.center,
              zoom: 15.4,
              ...camera,
              essential: true,
            })
          }
        >
          <LocateFixed size={18} />
        </button>
        <button type="button" title="확대" aria-label="확대" onClick={() => mapRef.current?.zoomIn()}>
          <Plus size={18} />
        </button>
        <button type="button" title="축소" aria-label="축소" onClick={() => mapRef.current?.zoomOut()}>
          <Minus size={18} />
        </button>
      </div>

      <div className="map-bottom-dock">
        <div className="map-bottom-metrics">{bottomMetrics}</div>
        <aside className="map-bottom-actions" aria-label="상권 비교와 지도 출처">
          <button
            type="button"
            className="compare-cta"
            disabled={!comparisonEnabled}
            title={comparisonEnabled ? undefined : "전체 지원 업종에서만 상권 비교를 제공합니다."}
            onClick={onCompareOpen}
          >
            <BarChart3 size={17} /> 전체 상권 비교
          </button>
          <div className="map-attribution">
            <span>{presentationMode === "flat" ? "OpenFreeMap" : "OpenFreeMap · LocalTwin"}</span>
            <span>© OpenStreetMap contributors</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
