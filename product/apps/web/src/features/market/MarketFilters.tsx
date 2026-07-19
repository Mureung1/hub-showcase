import { useState } from "react";
import { Building2, Coffee, Layers3, MapPinned, Store, Users, X } from "lucide-react";

import { categoryClass } from "./model";
import type { NearbyStoreState } from "../analysis/useNearbyStores";
import type { AnalysisRadius } from "../analysis/types";
import type {
  AnalysisScope,
  AnalysisTopic,
  Category,
  CategorySelection,
  LayerMode,
  Market,
  MarketKey,
  MarketStore,
} from "./types";

const categories: Array<{
  label: Category;
  icon: typeof Coffee;
  tone: string;
}> = [
  { label: "카페", icon: Coffee, tone: "green" },
  { label: "음식점", icon: Store, tone: "orange" },
  { label: "베이커리", icon: Building2, tone: "blue" },
  { label: "편의점", icon: MapPinned, tone: "gray" },
];

const analysisTopics: Array<{
  value: AnalysisTopic;
  label: string;
  available: boolean;
  reason?: string;
}> = [
  { value: "overview", label: "종합", available: true },
  { value: "stores", label: "점포·개폐업", available: true },
  { value: "sales", label: "매출·소비", available: true },
  { value: "competition", label: "경쟁 현황", available: true },
  { value: "flow", label: "유동인구", available: true },
  { value: "population", label: "주거·직장인구", available: true },
  { value: "amenities", label: "주변 시설·접근성", available: false, reason: "데이터 연결 예정" },
];

type MarketFiltersProps = {
  marketKey: MarketKey;
  markets: Record<MarketKey, Market>;
  category: Category | null;
  categorySelection: CategorySelection;
  categoryCoverageReason: string;
  radius: AnalysisRadius;
  layer: LayerMode;
  scope: AnalysisScope;
  topic: AnalysisTopic;
  boundaryVisible: boolean;
  storesVisible: boolean;
  usesAnalysis: boolean;
  visibleStores: MarketStore[];
  selectedStoreName: string | null;
  nearbyState: NearbyStoreState;
  onNearbyRetry: () => void;
  onClose: () => void;
  onReset: () => void;
  onMarketChange: (market: MarketKey) => void;
  onRadiusChange: (radius: AnalysisRadius) => void;
  onCategoryChange: (category: Category) => void;
  onLayerChange: (layer: LayerMode) => void;
  onScopeChange: (scope: AnalysisScope) => void;
  onTopicChange: (topic: AnalysisTopic) => void;
  onBoundaryVisibleChange: (visible: boolean) => void;
  onStoresVisibleChange: (visible: boolean) => void;
  onStoreChange: (storeName: string) => void;
};

export function MarketFilters({
  marketKey,
  markets,
  category,
  categorySelection,
  categoryCoverageReason,
  radius,
  layer,
  scope,
  topic,
  boundaryVisible,
  storesVisible,
  usesAnalysis,
  visibleStores,
  selectedStoreName,
  nearbyState,
  onNearbyRetry,
  onClose,
  onReset,
  onMarketChange,
  onRadiusChange,
  onCategoryChange,
  onLayerChange,
  onScopeChange,
  onTopicChange,
  onBoundaryVisibleChange,
  onStoresVisibleChange,
  onStoreChange,
}: MarketFiltersProps) {
  const [expandedStoreKey, setExpandedStoreKey] = useState<string | null>(null);
  const visibleStoreKey = visibleStores.map((store) => store.id ?? store.name).join("|");
  const showAllStores = expandedStoreKey === visibleStoreKey;
  const visibleStoreCount = showAllStores
    ? visibleStores.length
    : Math.min(5, visibleStores.length);
  const displayedStores = visibleStores.slice(0, visibleStoreCount);

  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <p>분석 범위</p>
        <div className="panel-heading-actions">
          <button type="button" className="text-button" onClick={onReset}>
            초기화
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label="분석 조건 닫기"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <label className="select-label">
        상권 선택
        <select
          value={marketKey}
          onChange={(event) => onMarketChange(event.target.value as MarketKey)}
        >
          {(Object.keys(markets) as MarketKey[]).map((name) => (
            <option key={name} value={name}>
              {markets[name].name}
            </option>
          ))}
        </select>
      </label>
      <div className="filter-group filter-section">
        <div className="filter-section-heading">
          <span>1</span>
          <div>
            <p className="filter-label">분석 기준</p>
            <small>어디를 비교할지 선택</small>
          </div>
        </div>
        <div className="scope-options" role="group" aria-label="분석 기준">
          <button
            type="button"
            className={scope === "market" ? "is-selected" : ""}
            aria-pressed={scope === "market"}
            onClick={() => onScopeChange("market")}
          >
            상권
          </button>
          <button
            type="button"
            className={scope === "radius" ? "is-selected" : ""}
            aria-pressed={scope === "radius"}
            onClick={() => onScopeChange("radius")}
          >
            직접 선택
          </button>
          <button type="button" disabled title="DATA-011 연결 후 사용할 수 있습니다.">
            행정동
          </button>
        </div>
        {scope === "market" ? (
          <p className="filter-help">서울시 공식 상권 경계를 기준으로 분석합니다.</p>
        ) : (
          <p className="filter-help">지도 중심점과 선택 반경을 기준으로 실제 점포를 조회합니다.</p>
        )}
      </div>
      <div className={`filter-group ${scope === "market" ? "is-muted" : ""}`}>
        <p className="filter-label">분석 반경</p>
        <div className="segmented" role="group" aria-label="분석 반경">
          {([100, 300, 500] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={radius === value ? "is-selected" : ""}
              aria-pressed={radius === value}
              disabled={scope !== "radius"}
              onClick={() => onRadiusChange(value)}
            >
              {value}m
            </button>
          ))}
        </div>
      </div>
      <div className="filter-group">
        <p className="filter-label">업종</p>
        <div className="category-list">
          {categories.map(({ label, icon: Icon, tone }) => (
            <button
              key={label}
              type="button"
              className={`category-option ${category === label ? "is-selected" : ""}`}
              onClick={() => onCategoryChange(label)}
            >
              <span className={`category-icon ${tone}`}>
                <Icon size={15} />
              </span>
              <span>{label}</span>
              <span className="check">{category === label ? "✓" : ""}</span>
            </button>
          ))}
        </div>
        <div className={`category-coverage is-${categorySelection.coverage}`} role="status">
          <div>
            <b>{categorySelection.name}</b>
            <span>
              {categorySelection.coverage === "full"
                ? "전체 지원"
                : categorySelection.coverage === "partial"
                  ? "부분 지원"
                  : "분석 미지원"}
            </span>
          </div>
          <p>{categoryCoverageReason}</p>
        </div>
      </div>
      <div className="filter-group filter-section">
        <div className="filter-section-heading">
          <span>2</span>
          <div>
            <p className="filter-label">분석 주제</p>
            <small>무엇을 확인할지 선택</small>
          </div>
        </div>
        <div className="topic-grid">
          {analysisTopics.map((item) => (
            <button
              key={item.value}
              type="button"
              className={topic === item.value ? "is-selected" : ""}
              aria-pressed={topic === item.value}
              disabled={!item.available}
              title={item.reason}
              onClick={() => onTopicChange(item.value)}
            >
              {item.label}
              {!item.available && <small>준비 중</small>}
            </button>
          ))}
        </div>
      </div>
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
          onClick={() => onBoundaryVisibleChange(!boundaryVisible)}
        >
          <MapPinned size={15} /> 상권 경계
        </button>
        <button
          type="button"
          className={storesVisible ? "layer-option active" : "layer-option"}
          aria-pressed={storesVisible}
          onClick={() => onStoresVisibleChange(!storesVisible)}
        >
          <Store size={15} /> 점포 위치
        </button>
        <button
          type="button"
          className={layer === "density" ? "layer-option active" : "layer-option"}
          aria-pressed={layer === "density"}
          onClick={() => onLayerChange("density")}
        >
          <Layers3 size={15} /> 업종 밀도
        </button>
        <button
          type="button"
          className={layer === "demand" ? "layer-option active" : "layer-option"}
          aria-pressed={layer === "demand"}
          onClick={() => onLayerChange("demand")}
        >
          <Users size={15} /> 시간대 수요
        </button>
        <button type="button" className="layer-option" disabled title="DATA-011 연결 예정">
          <Users size={15} /> 인구 밀도 <small>준비 중</small>
        </button>
      </div>
      <div className="store-list-heading">
        <span>주변 점포</span>
        <strong>{visibleStores.length}개</strong>
      </div>
      {nearbyState === "loading" && (
        <p className="nearby-state" role="status">
          주변 점포를 조회하고 있습니다.
        </p>
      )}
      {nearbyState === "empty" && (
        <p className="nearby-state" role="status">
          선택 반경 안에 조회 가능한 점포가 없습니다.
        </p>
      )}
      {nearbyState === "unsupported" && (
        <p className="nearby-state is-warning" role="status">
          연남·홍대·합정 지원 지역 안에서 분석 위치를 선택해 주세요.
        </p>
      )}
      {nearbyState === "error" && (
        <div className="nearby-state is-error" role="alert">
          <span>주변 점포를 불러오지 못했습니다.</span>
          <button type="button" onClick={onNearbyRetry}>
            다시 시도
          </button>
        </div>
      )}
      {nearbyState === "ready" && visibleStores.length > 0 && (
        <p className="store-list-status" role="status">
          {visibleStores.length}개 중 {visibleStoreCount}개 표시
        </p>
      )}
      <div className="store-list" aria-label="주변 점포 목록">
        {displayedStores.map((store) => (
          <button
            key={store.id ?? store.name}
            type="button"
            className={`store-row ${selectedStoreName === store.name ? "is-selected" : ""}`}
            onClick={() => onStoreChange(store.name)}
          >
            <span className={`store-dot ${categoryClass(store.category)}`} />
            <span className="store-row-main">
              <b>{store.name}</b>
              <small>
                {store.category} · {store.distance}
              </small>
            </span>
            <strong>{usesAnalysis ? "POI" : store.score}</strong>
          </button>
        ))}
      </div>
      {nearbyState === "ready" && visibleStores.length > 5 && (
        <button
          type="button"
          className="store-list-toggle"
          aria-expanded={showAllStores}
          onClick={() => setExpandedStoreKey(showAllStores ? null : visibleStoreKey)}
        >
          {showAllStores ? "목록 접기" : `${visibleStores.length}개 전체보기`}
        </button>
      )}
    </aside>
  );
}
