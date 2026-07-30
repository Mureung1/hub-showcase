import { Layers3, MapPinned, Store, Users } from "lucide-react";

import type { LayerMode } from "./types";

type MapLayerControlsProps = {
  layer: LayerMode;
  boundaryVisible: boolean;
  storesVisible: boolean;
  onLayerChange: (layer: LayerMode) => void;
  onBoundaryVisibleChange: (visible: boolean) => void;
  onStoresVisibleChange: (visible: boolean) => void;
};

export function MapLayerControls({
  layer,
  boundaryVisible,
  storesVisible,
  onLayerChange,
  onBoundaryVisibleChange,
  onStoresVisibleChange,
}: MapLayerControlsProps) {
  return (
    <div className="filter-group layer-filter filter-section">
      <div className="filter-section-heading">
        <span>3</span>
        <div>
          <p className="filter-label">지도 표시</p>
          <small>지도 위에 보일 정보 선택</small>
        </div>
      </div>
      <button
        type="button"
        className={boundaryVisible ? "layer-option active" : "layer-option"}
        aria-pressed={boundaryVisible}
        title="지원 상권의 서울시 공식 경계선을 지도에 표시합니다."
        onClick={() => onBoundaryVisibleChange(!boundaryVisible)}
      >
        <MapPinned size={15} /> 상권 경계
      </button>
      <button
        type="button"
        className={storesVisible ? "layer-option active" : "layer-option"}
        aria-pressed={storesVisible}
        title="2026년 6월 원천 스냅샷에 등록된 점포 위치입니다. 실시간 영업 여부가 아니며 선택한 분석 분기와 기준 시점이 다릅니다."
        onClick={() => onStoresVisibleChange(!storesVisible)}
      >
        <Store size={15} /> 점포 위치 <small>2026.06 스냅샷</small>
      </button>
      <button
        type="button"
        className={layer === "density" ? "layer-option active" : "layer-option"}
        aria-pressed={layer === "density"}
        title="2026년 6월 점포 원천 스냅샷에서 선택 업종이 상대적으로 모인 정도를 표시합니다."
        onClick={() => onLayerChange("density")}
      >
        <Layers3 size={15} /> 업종 밀도
      </button>
      <button
        type="button"
        className={layer === "demand" ? "layer-option active" : "layer-option"}
        aria-pressed={layer === "demand"}
        title="선택 분기의 유동인구를 시간대끼리 비교한 상대값입니다. 서울시 길단위인구 기반 추정치이며 실제 보행 위치나 이동 경로가 아닙니다."
        onClick={() => onLayerChange("demand")}
      >
        <Users size={15} /> 유동인구
      </button>
      <button type="button" className="layer-option" disabled title="DATA-011 연결 예정">
        <Users size={15} /> 인구 밀도 <small>준비 중</small>
      </button>
    </div>
  );
}
