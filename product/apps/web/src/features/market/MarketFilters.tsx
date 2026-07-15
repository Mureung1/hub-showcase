import { Building2, Coffee, Layers3, MapPinned, Store, Users } from "lucide-react";

import { categoryClass } from "./model";
import type { Category, LayerMode, Market, MarketKey, MarketStore } from "./types";

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

type MarketFiltersProps = {
  marketKey: MarketKey;
  markets: Record<MarketKey, Market>;
  category: Category;
  radius: number;
  layer: LayerMode;
  sameCategoryCount: number;
  usesAnalysis: boolean;
  visibleStores: MarketStore[];
  selectedStoreName: string;
  onReset: () => void;
  onMarketChange: (market: MarketKey) => void;
  onRadiusChange: (radius: number) => void;
  onCategoryChange: (category: Category) => void;
  onLayerChange: (layer: LayerMode) => void;
  onStoreChange: (storeName: string) => void;
};

export function MarketFilters({
  marketKey,
  markets,
  category,
  radius,
  layer,
  sameCategoryCount,
  usesAnalysis,
  visibleStores,
  selectedStoreName,
  onReset,
  onMarketChange,
  onRadiusChange,
  onCategoryChange,
  onLayerChange,
  onStoreChange,
}: MarketFiltersProps) {
  return (
    <aside className="filter-panel">
      <div className="panel-heading">
        <p>분석 범위</p>
        <button type="button" className="text-button" onClick={onReset}>
          초기화
        </button>
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
      <div className="filter-group">
        <p className="filter-label">분석 반경</p>
        <div className="segmented" role="group" aria-label="분석 반경">
          {[100, 300, 500].map((value) => (
            <button
              key={value}
              type="button"
              className={radius === value ? "is-selected" : ""}
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
      </div>
      <div className="filter-group layer-filter">
        <p className="filter-label">지도 레이어</p>
        <button
          type="button"
          className={layer === "density" ? "layer-option active" : "layer-option"}
          onClick={() => onLayerChange("density")}
        >
          <Layers3 size={15} /> 경쟁 밀도
        </button>
        <button
          type="button"
          className={layer === "demand" ? "layer-option active" : "layer-option"}
          onClick={() => onLayerChange("demand")}
        >
          <Users size={15} /> 시간대 수요
        </button>
      </div>
      <div className="store-list-heading">
        <span>주변 점포</span>
        <strong>{sameCategoryCount}개</strong>
      </div>
      <div className="store-list">
        {visibleStores.map((store) => (
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
    </aside>
  );
}
