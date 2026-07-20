import { Building2, Coffee, MapPinned, Store, X } from "lucide-react";

import { MapLayerControls } from "./MapLayerControls";
import { NearbyStoreList } from "./NearbyStoreList";
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

const categoryPresentation: Record<
  Category,
  {
    icon: typeof Coffee;
    tone: string;
  }
> = {
  카페: { icon: Coffee, tone: "green" },
  음식점: { icon: Store, tone: "orange" },
  베이커리: { icon: Building2, tone: "blue" },
  편의점: { icon: MapPinned, tone: "gray" },
};

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

function CategoryOptions({
  categories,
  selected,
  onChange,
}: {
  categories: Category[];
  selected: Category | null;
  onChange: (category: Category) => void;
}) {
  return categories.map((label) => {
    const { icon: Icon, tone } = categoryPresentation[label];
    return (
      <button
        key={label}
        type="button"
        className={`category-option ${selected === label ? "is-selected" : ""}`}
        onClick={() => onChange(label)}
      >
        <span className={`category-icon ${tone}`}>
          <Icon size={15} />
        </span>
        <span>{label}</span>
        <span className="check">{selected === label ? "✓" : ""}</span>
      </button>
    );
  });
}

type MarketFiltersProps = {
  marketKey: MarketKey;
  markets: Record<MarketKey, Market>;
  supportedCategories: Category[];
  supportedRadii: AnalysisRadius[];
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
  supportedCategories,
  supportedRadii,
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
          {supportedRadii.map((value) => (
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
          <CategoryOptions
            categories={supportedCategories}
            selected={category}
            onChange={onCategoryChange}
          />
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
      <MapLayerControls
        layer={layer}
        boundaryVisible={boundaryVisible}
        storesVisible={storesVisible}
        onLayerChange={onLayerChange}
        onBoundaryVisibleChange={onBoundaryVisibleChange}
        onStoresVisibleChange={onStoresVisibleChange}
      />
      <NearbyStoreList
        stores={visibleStores}
        selectedStoreName={selectedStoreName}
        state={nearbyState}
        usesAnalysis={usesAnalysis}
        onRetry={onNearbyRetry}
        onSelect={onStoreChange}
      />
    </aside>
  );
}
