import { useEffect, useMemo, useState } from "react";

import type { MarketSearchResult } from "../search/searchApi";
import type { MarketKey, MarketStore } from "./types";

type StoreSelectionOptions = {
  marketKey: MarketKey;
  marketKeyById: Record<string, MarketKey>;
  score: number;
  nearbyStores: MarketStore[];
};

function searchResultStore(
  result: MarketSearchResult | null,
  marketKey: MarketKey,
  marketKeyById: Record<string, MarketKey>,
  score: number,
): MarketStore | null {
  if (result?.result_type !== "store" || marketKeyById[result.market_id] !== marketKey) return null;
  return {
    id: result.id,
    name: result.name,
    category: result.category_name ?? "업종 미분류",
    categoryCode: result.category_code,
    address: result.address ?? undefined,
    distance: "검색 결과",
    score,
    longitude: result.longitude,
    latitude: result.latitude,
  };
}

export function useStoreSelection({
  marketKey,
  marketKeyById,
  score,
  nearbyStores,
}: StoreSelectionOptions) {
  const [selectedStoreName, setSelectedStoreName] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<MarketSearchResult | null>(null);
  const selectedSearchStore = useMemo(
    () => searchResultStore(selectedSearchResult, marketKey, marketKeyById, score),
    [marketKey, marketKeyById, score, selectedSearchResult],
  );
  const selectedNearbyStore = useMemo(
    () => nearbyStores.find((store) => store.name === selectedStoreName) ?? null,
    [nearbyStores, selectedStoreName],
  );

  useEffect(() => {
    if (!selectedStoreName || selectedSearchStore) return;
    if (!nearbyStores.some((store) => store.name === selectedStoreName)) {
      setSelectedStoreName(null);
    }
  }, [nearbyStores, selectedSearchStore, selectedStoreName]);

  return {
    selectedStoreName,
    selectedSearchResult,
    selectedSearchStore,
    selected: selectedSearchStore ?? selectedNearbyStore,
    clearSelection: () => {
      setSelectedSearchResult(null);
      setSelectedStoreName(null);
    },
    selectListedStore: (name: string) => {
      setSelectedSearchResult(null);
      setSelectedStoreName(name);
    },
    selectSearchResult: (result: MarketSearchResult) => {
      setSelectedSearchResult(result);
      setSelectedStoreName(result.result_type === "store" ? result.name : null);
    },
  };
}
