import { useEffect, useMemo, useState } from "react";

import type { MarketSearchResult } from "../search/searchApi";
import type { MarketKey, MarketStore } from "./types";

type StoreSelectionOptions = {
  marketKey: MarketKey;
  marketKeyById: Record<string, MarketKey>;
  score: number;
  nearbyStores: MarketStore[];
};

type StoreReference = {
  id: string | null;
  name: string | null;
};

function initialStoreReference(): StoreReference {
  const parameters = new URLSearchParams(window.location.search);
  return {
    id: parameters.get("store")?.trim() || null,
    name: parameters.get("storeName")?.trim() || null,
  };
}

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

function matchesReference(store: MarketStore, reference: StoreReference) {
  if (reference.id && store.id === reference.id) return true;
  return Boolean(reference.name && store.name === reference.name);
}

export function useStoreSelection({
  marketKey,
  marketKeyById,
  score,
  nearbyStores,
}: StoreSelectionOptions) {
  const [selectedReference, setSelectedReference] = useState<StoreReference>(initialStoreReference);
  const [selectedSearchResult, setSelectedSearchResult] = useState<MarketSearchResult | null>(null);
  const selectedSearchStore = useMemo(
    () => searchResultStore(selectedSearchResult, marketKey, marketKeyById, score),
    [marketKey, marketKeyById, score, selectedSearchResult],
  );
  const selectedNearbyStore = useMemo(
    () => nearbyStores.find((store) => matchesReference(store, selectedReference)) ?? null,
    [nearbyStores, selectedReference],
  );

  useEffect(() => {
    if ((!selectedReference.id && !selectedReference.name) || selectedSearchStore) return;
    if (nearbyStores.length > 0 && !nearbyStores.some((store) => matchesReference(store, selectedReference))) {
      setSelectedReference({ id: null, name: null });
    }
  }, [nearbyStores, selectedReference, selectedSearchStore]);

  return {
    selectedStoreName: selectedReference.name,
    selectedSearchResult,
    selectedSearchStore,
    selectedReference,
    selected: selectedSearchStore ?? selectedNearbyStore,
    clearSelection: () => {
      setSelectedSearchResult(null);
      setSelectedReference({ id: null, name: null });
    },
    selectListedStore: (storeKey: string) => {
      const store = nearbyStores.find(
        (candidate) => (candidate.id ?? candidate.name) === storeKey,
      );
      setSelectedSearchResult(null);
      setSelectedReference({ id: store?.id ?? null, name: store?.name ?? storeKey });
    },
    selectSearchResult: (result: MarketSearchResult) => {
      setSelectedSearchResult(result);
      setSelectedReference(
        result.result_type === "store"
          ? { id: result.id, name: result.name }
          : { id: null, name: null },
      );
    },
  };
}
