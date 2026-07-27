import { Building2, Coffee, MapPinned, Store, X } from "lucide-react";

import { MapLayerControls } from "./MapLayerControls";
import { NearbyStoreList } from "./NearbyStoreList";
import { TermHelp } from "./TermHelp";
import type { NearbyStoreState } from "../analysis/useNearbyStores";
import type {
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
  category: Category | null;
  categorySelection: CategorySelection;
  categoryCoverageReason: string;
  layer: LayerMode;
  topic: AnalysisTopic;
  boundaryVisible: boolean;
  storesVisible: boolean;
  visibleStores: MarketStore[];
  selectedStoreName: string | null;
  nearbyState: NearbyStoreState;
  onNearbyRetry: () => void;
  onClose: () => void;
  onReset: () => void;
  onMarketChange: (market: MarketKey) => void;
  onCategoryChange: (category: Category) => void;
  onLayerChange: (layer: LayerMode) => void;
  onTopicChange: (topic: AnalysisTopic) => void;
  onBoundaryVisibleChange: (visible: boolean) => void;
  onStoresVisibleChange: (visible: boolean) => void;
  onStoreChange: (storeName: string) => void;
};

export function MarketFilters({
  marketKey,
  markets,
  supportedCategories,
  category,
  categorySelection,
  categoryCoverageReason,
  layer,
  topic,
  boundaryVisible,
  storesVisible,
  visibleStores,
  selectedStoreName,
  nearbyState,
  onNearbyRetry,
  onClose,
  onReset,
  onMarketChange,
  onCategoryChange,
  onLayerChange,
  onTopicChange,
  onBoundaryVisibleChange,
  onStoresVisibleChange,
  onStoreChange,
}: MarketFiltersProps) {
  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <p>어디를 볼까요?</p>
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
        <span className="select-label-title">
          상권 선택
          <TermHelp
            term="상권"
            description="사람들이 쇼핑하거나 식사하는 등 가게를 이용하는 생활·상업 범위입니다. 행정구역과 꼭 일치하지는 않습니다."
          />
        </span>
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
            <p className="filter-label">
              분석 기준
              <TermHelp term="분석 기준" description="현재 화면의 숫자를 어떤 범위와 자료를 기준으로 계산했는지 알려주는 설명입니다." />
            </p>
            <small>서울시 공식 상권 경계로 집계</small>
          </div>
        </div>
        <p className="filter-help">
          선택한 상권 안의 점포와 매출·유동인구 같은 주요 정보를 보여줍니다.
        </p>
      </div>
      <div className="filter-group">
        <p className="filter-label">
          어떤 가게인가요?
          <TermHelp term="업종" description="카페, 음식점처럼 가게가 제공하는 상품이나 서비스의 종류입니다." />
        </p>
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
            <p className="filter-label">무엇을 확인할까요?</p>
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
        onRetry={onNearbyRetry}
        onSelect={onStoreChange}
      />
    </aside>
  );
}
