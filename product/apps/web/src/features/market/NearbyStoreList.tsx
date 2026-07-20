import { useState } from "react";

import type { NearbyStoreState } from "../analysis/useNearbyStores";
import { categoryClass } from "./model";
import type { MarketStore } from "./types";

type NearbyStoreListProps = {
  stores: MarketStore[];
  selectedStoreName: string | null;
  state: NearbyStoreState;
  usesAnalysis: boolean;
  onRetry: () => void;
  onSelect: (storeName: string) => void;
};

export function NearbyStoreList({
  stores,
  selectedStoreName,
  state,
  usesAnalysis,
  onRetry,
  onSelect,
}: NearbyStoreListProps) {
  const [expandedStoreKey, setExpandedStoreKey] = useState<string | null>(null);
  const storeKey = stores.map((store) => store.id ?? store.name).join("|");
  const showAll = expandedStoreKey === storeKey;
  const visibleCount = showAll ? stores.length : Math.min(5, stores.length);
  const displayedStores = stores.slice(0, visibleCount);

  return (
    <>
      <div className="store-list-heading"><span>주변 점포</span><strong>{stores.length}개</strong></div>
      {state === "loading" && <p className="nearby-state" role="status">주변 점포를 조회하고 있습니다.</p>}
      {state === "empty" && <p className="nearby-state" role="status">선택 반경 안에 조회 가능한 점포가 없습니다.</p>}
      {state === "unsupported" && <p className="nearby-state is-warning" role="status">연남·홍대·합정 지원 지역 안에서 분석 위치를 선택해 주세요.</p>}
      {state === "error" && <div className="nearby-state is-error" role="alert"><span>주변 점포를 불러오지 못했습니다.</span><button type="button" onClick={onRetry}>다시 시도</button></div>}
      {state === "ready" && stores.length > 0 && <p className="store-list-status" role="status">{stores.length}개 중 {visibleCount}개 표시</p>}
      <div className="store-list" aria-label="주변 점포 목록">
        {displayedStores.map((store) => (
          <button key={store.id ?? store.name} type="button" className={selectedStoreName === store.name ? "store-row is-selected" : "store-row"} onClick={() => onSelect(store.name)}>
            <span className={`store-dot ${categoryClass(store.category)}`} />
            <span className="store-row-main"><b>{store.name}</b><small>{store.category} · {store.distance}</small></span>
            <strong>{usesAnalysis ? "POI" : store.score}</strong>
          </button>
        ))}
      </div>
      {state === "ready" && stores.length > 5 && <button type="button" className="store-list-toggle" aria-expanded={showAll} onClick={() => setExpandedStoreKey(showAll ? null : storeKey)}>{showAll ? "목록 접기" : `${stores.length}개 전체보기`}</button>}
    </>
  );
}
