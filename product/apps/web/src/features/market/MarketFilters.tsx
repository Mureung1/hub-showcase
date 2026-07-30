import { X } from "lucide-react";

import { MapLayerControls } from "./MapLayerControls";
import { NearbyStoreList } from "./NearbyStoreList";
import { resolveCategoryPresentation } from "./categoryPresentation";
import { TermHelp } from "./TermHelp";
import type { ProductCategory } from "../../services/productCatalog";
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
  { value: "flow", label: "길단위인구·시간대", available: true },
  { value: "population", label: "주거·직장인구", available: true },
  { value: "amenities", label: "주변 시설·접근성", available: false, reason: "데이터 연결 예정" },
];

function selectedMarketCount(
  category: ProductCategory,
  marketKey: MarketKey,
  selected: Category | null,
  selectedCategoryCount: number | null,
) {
  const catalogCount = category.store_counts_by_market?.[marketKey];
  if (category.name === selected && selectedCategoryCount !== null) {
    return selectedCategoryCount;
  }
  return catalogCount;
}

function CategoryOptions({
  categories,
  marketKey,
  marketName,
  showMarketCounts,
  selected,
  selectedCategoryCount,
  onChange,
}: {
  categories: ProductCategory[];
  marketKey: MarketKey;
  marketName: string;
  showMarketCounts: boolean;
  selected: Category | null;
  selectedCategoryCount: number | null;
  onChange: (category: Category) => void;
}) {
  const orderedCategories = showMarketCounts
    ? [...categories].sort((left, right) => {
        const leftCount = selectedMarketCount(left, marketKey, selected, selectedCategoryCount);
        const rightCount = selectedMarketCount(right, marketKey, selected, selectedCategoryCount);
        const countDifference = (rightCount ?? -1) - (leftCount ?? -1);
        return countDifference || left.name.localeCompare(right.name, "ko-KR");
      })
    : categories;

  return orderedCategories.map((category, index) => {
    const { name, rank } = category;
    const { icon: Icon, tone } = resolveCategoryPresentation(name);
    const displayRank = showMarketCounts ? index + 1 : (rank ?? index + 1);
    const marketStoreCount = showMarketCounts
      ? selectedMarketCount(category, marketKey, selected, selectedCategoryCount)
      : undefined;
    return (
      <button
        key={name}
        type="button"
        className={`category-option ${selected === name ? "is-selected" : ""}`}
        aria-label={name}
        aria-pressed={selected === name}
        title={`${displayRank}위${marketStoreCount === undefined ? " · 상권 점포 수 확인 중" : ` · ${marketName} ${marketStoreCount.toLocaleString("ko-KR")}곳 · 2026.06 점포 위치 기준`}`}
        onClick={() => onChange(name)}
      >
        <span className="category-rank" aria-hidden="true">
          {displayRank}
        </span>
        <span className={`category-icon ${tone}`}>
          <Icon size={15} />
        </span>
        <span className="category-option-main">
          <span className="category-option-name">{name}</span>
        </span>
        {showMarketCounts && (
          <strong className="category-market-count">
            {marketStoreCount === undefined ? "—" : `${marketStoreCount.toLocaleString("ko-KR")}곳`}
          </strong>
        )}
        <span className="check" aria-hidden="true">
          {selected === name ? "✓" : ""}
        </span>
      </button>
    );
  });
}

function CategoryLoadingState({ selected }: { selected: Category }) {
  const { icon: Icon, tone } = resolveCategoryPresentation(selected);
  return (
    <div className="category-loading-state" role="status" aria-label="업종 순위를 불러오는 중">
      <div className="category-option is-selected is-loading-selection">
        <span className="category-rank" aria-hidden="true">
          —
        </span>
        <span className={`category-icon ${tone}`}>
          <Icon size={15} />
        </span>
        <span className="category-option-main">
          <span className="category-option-name">{selected}</span>
          <small>선택 상태 유지 중</small>
        </span>
        <span className="check" aria-hidden="true">
          ✓
        </span>
      </div>
      <div className="category-loading-skeleton" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}

type MarketFiltersProps = {
  marketKey: MarketKey;
  markets: Record<MarketKey, Market>;
  supportedCategories: ProductCategory[];
  catalogState: "ranked" | "connecting" | "bootstrap" | "error";
  onCatalogRetry: () => void;
  category: Category | null;
  categorySelection: CategorySelection;
  layer: LayerMode;
  topic: AnalysisTopic;
  boundaryVisible: boolean;
  storesVisible: boolean;
  visibleStores: MarketStore[];
  selectedStoreName: string | null;
  sameCategoryCount?: number | null;
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
  onStoreChange: (storeKey: string) => void;
};

export function MarketFilters({
  marketKey,
  markets,
  supportedCategories,
  catalogState,
  onCatalogRetry,
  category,
  categorySelection,
  layer,
  topic,
  boundaryVisible,
  storesVisible,
  visibleStores,
  selectedStoreName,
  sameCategoryCount = null,
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
  const catalogLabel =
    catalogState === "ranked"
      ? "점포 위치 2026.06"
      : catalogState === "connecting"
        ? "불러오는 중"
        : "기본 목록";
  const resolvedSelectedCategoryCount =
    nearbyState === "ready" || nearbyState === "empty" ? sameCategoryCount : null;

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
              <TermHelp
                term="분석 기준"
                description="현재 화면의 숫자를 어떤 범위와 자료를 기준으로 계산했는지 알려주는 설명입니다."
              />
            </p>
            <small>서울시 공식 상권 경계로 집계</small>
          </div>
        </div>
        <p className="filter-help">
          점포 위치는 2026.06, 매출·길단위인구·개폐업은 선택한 분기 기준으로 보여줍니다.
        </p>
      </div>
      <div className="filter-group">
        <div className="category-heading-row">
          <p className="filter-label">
            어떤 가게인가요?
            <TermHelp
              term="업종"
              description="카페, 음식점처럼 가게가 제공하는 상품이나 서비스의 종류입니다."
            />
          </p>
          <span>{catalogLabel}</span>
        </div>
        <div className={`catalog-status is-${catalogState}`} role="status">
          {catalogState === "ranked" &&
            `${markets[marketKey].name} 안의 2026.06 점포 위치 수가 많은 순서입니다.`}
          {catalogState === "connecting" &&
            "선택한 업종을 유지한 채 현재 상권의 업종 순위를 불러오고 있습니다."}
          {catalogState === "bootstrap" &&
            "기본 업종 목록입니다. 현재 상권 점포 수는 데이터 연결 후 표시됩니다."}
          {catalogState === "error" && (
            <>
              <span>기본 업종 목록을 보여드리고 있습니다. 순위 데이터를 불러오지 못했습니다.</span>
              <button type="button" className="text-button" onClick={onCatalogRetry}>
                다시 시도
              </button>
            </>
          )}
        </div>
        <div
          className="category-list"
          aria-label="분석 업종 선택"
          aria-busy={catalogState === "connecting"}
        >
          {catalogState === "connecting" ? (
            <CategoryLoadingState selected={categorySelection.name} />
          ) : (
            <CategoryOptions
              categories={supportedCategories}
              marketKey={marketKey}
              marketName={markets[marketKey].name}
              showMarketCounts={catalogState === "ranked"}
              selected={category}
              selectedCategoryCount={resolvedSelectedCategoryCount}
              onChange={onCategoryChange}
            />
          )}
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
        categoryName={categorySelection.name}
        stores={visibleStores}
        selectedStoreName={selectedStoreName}
        state={nearbyState}
        onRetry={onNearbyRetry}
        onSelect={onStoreChange}
      />
    </aside>
  );
}
