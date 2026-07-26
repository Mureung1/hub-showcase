import { useEffect, useMemo } from "react";

import { useAnalysisUrlCleanup } from "../analysis/useAnalysisUrlCleanup";
import { useNearbyStores } from "../analysis/useNearbyStores";
import { categoryMatchesSelection, storeCategorySelection } from "../market/categorySelection";
import { demandFromFlow } from "../market/model";
import type { Category, LayerMode, Market, MarketKey, MarketStore } from "../market/types";
import { useAnalysisSelection } from "../analysis/useAnalysisSelection";
import { useMarketAnalysis } from "../market/useMarketAnalysis";
import { useStoreSelection } from "../market/useStoreSelection";
import { findReadyOverlayRegion } from "../map/supportedRegions";
import type { SelectedStorefront } from "../map/storefronts/SelectedStorefrontLayer";
import { hasStorefrontVariant } from "../map/storefronts/storefrontRegistry";
import { selectMapStores } from "../map/storefronts/storefrontSelection";
import { useCompactMap } from "../map/useCompactMap";
import { useMapViewport } from "../map/useMapViewport";
import { useWorkspacePanels } from "./useWorkspacePanels";
import type { ApiReadinessState } from "../system/useApiReadiness";
import type { MarketSearchResult } from "../search/searchApi";
import type { ProductCatalog, SupportedMarket } from "../../services/productCatalog";
import { readAnalysisUrlState } from "../analysis/analysisUrlState";

type SelectionState = ReturnType<typeof useAnalysisSelection>;
type PanelState = ReturnType<typeof useWorkspacePanels>;
type ViewportState = ReturnType<typeof useMapViewport>;

type WorkspaceCatalog = {
  markets: Record<MarketKey, Market>;
  marketKeyById: Record<string, MarketKey>;
  marketIdByKey: Record<MarketKey, string>;
  defaultMarket: SupportedMarket;
  hasInitialUrlState: boolean;
  initialUrlState: ReturnType<typeof initialAnalysisUrlState>;
};

function emptyMarket(market: SupportedMarket): Market {
  return {
    name: market.name,
    address: market.address,
    center: market.center,
    score: 0,
    grade: "분석 데이터 확인 중",
    footfall: "조회 중",
    workPopulation: "조회 중",
    residentPopulation: "조회 중",
    opening: 0,
    closing: 0,
    demand: [],
    demandLabels: [],
    insight: "공식 분석 데이터를 불러오는 중입니다.",
    stores: [],
    landmarks: [],
  };
}

function initialAnalysisUrlState(catalog: ProductCatalog) {
  const defaultMarket = catalog.markets[0];
  const defaultCategory = catalog.categories[0]?.name ?? "카페";
  return readAnalysisUrlState(
    {
      marketKey: defaultMarket.key,
      category: defaultCategory,
      selectedCategoryName: defaultCategory,
      selectedCategoryCode: null,
      radius: catalog.radii.includes(300) ? 300 : catalog.radii[0],
      layer: "density",
      scope: "market",
      topic: "overview",
      boundaryVisible: true,
      storesVisible: true,
      period: "",
      center: defaultMarket.center,
    },
    {
      marketKeys: catalog.markets.map((market) => market.key),
      categories: catalog.categories.map((category) => category.name),
      radii: catalog.radii,
    },
  );
}

function useWorkspaceCatalog(catalog: ProductCatalog): WorkspaceCatalog {
  const markets = useMemo(
    () =>
      Object.fromEntries(
        catalog.markets.map((market) => [market.key, emptyMarket(market)]),
      ) as Record<MarketKey, Market>,
    [catalog.markets],
  );
  const marketKeyById = useMemo(
    () => Object.fromEntries(catalog.markets.map((market) => [market.market_id, market.key])),
    [catalog.markets],
  ) as Record<string, MarketKey>;
  const marketIdByKey = useMemo(
    () => Object.fromEntries(catalog.markets.map((market) => [market.key, market.market_id])),
    [catalog.markets],
  ) as Record<MarketKey, string>;
  const initialUrlState = useMemo(() => initialAnalysisUrlState(catalog), [catalog]);

  return {
    markets,
    marketKeyById,
    marketIdByKey,
    defaultMarket: catalog.markets[0],
    hasInitialUrlState: window.location.search.length > 1,
    initialUrlState,
  };
}

function useWorkspaceMarketData(
  catalog: ProductCatalog,
  catalogState: WorkspaceCatalog,
  selection: SelectionState,
  useDemoData: boolean,
  apiReady: boolean,
) {
  const { setMarketKey, syncCategoryCoverage } = selection;
  const selectedMarket =
    catalog.markets.find((market) => market.key === selection.marketKey) ??
    catalogState.defaultMarket;
  const marketAnalysis = useMarketAnalysis(
    selectedMarket,
    catalog.markets,
    selection.categorySelection.coverage === "full"
      ? selection.categorySelection.analysisCategory
      : null,
    selection.period,
    useDemoData,
    apiReady,
  );
  const nearby = useNearbyStores(
    {
      center: selectedMarket.center,
      radius: selection.radius,
      category: selection.categorySelection.name,
      scope: "market",
      marketId: catalogState.marketIdByKey[selection.marketKey],
    },
    apiReady,
  );
  useAnalysisUrlCleanup({
    hasInitialUrlState: catalogState.hasInitialUrlState,
    period: selection.period,
    availablePeriods: marketAnalysis.availablePeriods,
    defaultPeriod: marketAnalysis.defaultPeriod,
    onPeriodChange: selection.setPeriod,
  });

  useEffect(() => {
    syncCategoryCoverage(nearby.data?.category_coverage);
  }, [nearby.data?.category_coverage, syncCategoryCoverage]);

  useEffect(() => {
    const responseMatchesCenter =
      nearby.data &&
      Math.abs(nearby.data.center.longitude - selectedMarket.center[0]) < 0.000001 &&
      Math.abs(nearby.data.center.latitude - selectedMarket.center[1]) < 0.000001;
    const responseMarket =
      responseMatchesCenter && nearby.data
        ? catalogState.marketKeyById[nearby.data.market_id]
        : undefined;
    if (responseMarket && responseMarket !== selection.marketKey) setMarketKey(responseMarket);
  }, [
    catalogState.marketKeyById,
    nearby.data,
    selection.marketKey,
    setMarketKey,
    selectedMarket.center,
  ]);

  const market = useMemo(() => {
    const base = catalogState.markets[selection.marketKey];
    const analysis = marketAnalysis.analysis;
    if (!analysis) return base;
    const reason = analysis.score.reasons
      .slice(0, 2)
      .map((item) => item.message)
      .join(" ");
    return {
      ...base,
      score: Math.round(analysis.score.score),
      grade: `${analysis.score.band} · 신뢰도 ${analysis.score.confidence_label}`,
      footfall:
        analysis.raw.total_flow == null
          ? "미수집"
          : `${Math.round(analysis.raw.total_flow).toLocaleString("ko-KR")}명/분기`,
      workPopulation: marketAnalysis.background
        ? `${marketAnalysis.background.market_workers.value.toLocaleString("ko-KR")}명`
        : "조회 중",
      residentPopulation: marketAnalysis.background
        ? `${marketAnalysis.background.market_resident_population.value.toLocaleString("ko-KR")}명`
        : "조회 중",
      opening: analysis.raw.opening_count,
      closing: analysis.raw.closure_count,
      demand: demandFromFlow(analysis.raw.flow_time_buckets),
      demandLabels: analysis.raw.flow_time_buckets.map((bucket) => bucket.label),
      insight: reason || analysis.score.cluster.explanation,
    };
  }, [
    catalogState.markets,
    marketAnalysis.analysis,
    marketAnalysis.background,
    selection.marketKey,
  ]);

  return { marketAnalysis, nearby, market };
}

function useWorkspaceStorefronts(
  compactMap: boolean,
  catalogState: WorkspaceCatalog,
  selection: SelectionState,
  viewport: ViewportState,
  marketData: ReturnType<typeof useWorkspaceMarketData>,
) {
  const { market, nearby, marketAnalysis } = marketData;
  const nearbyMarketStores = useMemo<MarketStore[]>(
    () =>
      (nearby.data?.stores ?? []).map((store) => ({
        id: store.id,
        name: store.name,
        category: store.category_name ?? "업종 미분류",
        categoryCode: store.category_code,
        address: store.address ?? undefined,
        distance: `${Math.round(store.distance_meters)}m`,
        score: market.score,
        longitude: store.longitude,
        latitude: store.latitude,
      })),
    [market.score, nearby.data],
  );
  const storeSelection = useStoreSelection({
    marketKey: selection.marketKey,
    marketKeyById: catalogState.marketKeyById,
    score: market.score,
    nearbyStores: nearbyMarketStores,
  });
  const selectedStorefront3d = useMemo<SelectedStorefront | null>(() => {
    const selectedSearchResult = storeSelection.selectedSearchResult;
    if (
      !viewport.prefabMode ||
      viewport.storefront3dUnavailable ||
      viewport.mapMode !== "localtwin" ||
      selectedSearchResult?.result_type !== "store" ||
      !hasStorefrontVariant(selectedSearchResult.category_code) ||
      !findReadyOverlayRegion([selectedSearchResult.longitude, selectedSearchResult.latitude])
    ) {
      return null;
    }
    return {
      id: selectedSearchResult.id,
      longitude: selectedSearchResult.longitude,
      latitude: selectedSearchResult.latitude,
      categoryCode: selectedSearchResult.category_code,
    };
  }, [storeSelection.selectedSearchResult, viewport]);
  const visibleStores = useMemo(() => {
    const sourceStores = nearbyMarketStores;
    const stores = storeSelection.selectedSearchStore
      ? [
          storeSelection.selectedSearchStore,
          ...sourceStores.filter(
            (store) =>
              (store.id ?? store.name) !== storeSelection.selectedSearchStore?.id &&
              store.name !== storeSelection.selectedSearchStore?.name,
          ),
        ]
      : sourceStores;
    const orderedStores = [
      ...stores.filter((store) =>
        categoryMatchesSelection(store.category, selection.categorySelection),
      ),
      ...stores.filter(
        (store) => !categoryMatchesSelection(store.category, selection.categorySelection),
      ),
    ];
    return selectedStorefront3d
      ? orderedStores.filter((store) => (store.id ?? store.name) !== selectedStorefront3d.id)
      : orderedStores;
  }, [
    nearbyMarketStores,
    selectedStorefront3d,
    selection.categorySelection,
    storeSelection.selectedSearchStore,
  ]);
  const listedStores = useMemo(
    () =>
      visibleStores.filter((store) =>
        categoryMatchesSelection(store.category, selection.categorySelection),
      ),
    [selection.categorySelection, visibleStores],
  );
  const mapStores = useMemo(
    () =>
      selectMapStores(visibleStores, {
        selectedName: storeSelection.selected?.name ?? null,
        focus: selectedStorefront3d
          ? [selectedStorefront3d.longitude, selectedStorefront3d.latitude]
          : null,
        limit: compactMap ? 6 : 12,
        bounds: viewport.visibleMapBounds,
        minimumDistanceMeters: selectedStorefront3d
          ? compactMap
            ? 125
            : 105
          : compactMap
            ? 55
            : 40,
      }),
    [
      compactMap,
      selectedStorefront3d,
      storeSelection.selected?.name,
      viewport.visibleMapBounds,
      visibleStores,
    ],
  );
  const sameCategoryCount = nearby.data?.same_category_count ?? 0;
  const categoryCoverageReason =
    nearby.data?.category_coverage.requested_category === selection.categorySelection.name
      ? nearby.data.category_coverage.reason
      : selection.categorySelection.coverage === "full"
        ? "선택 업종은 현재 상권 분석 지표를 모두 지원합니다."
        : selection.categorySelection.coverage === "partial"
          ? "해당 세부 업종은 점포 위치와 상권 경쟁 지표만 제공합니다."
          : "선택 범위에서 해당 업종의 분석 근거를 확인할 수 없습니다.";
  const score =
    selection.categorySelection.coverage === "full" && marketAnalysis.analysis
      ? Math.round(marketAnalysis.analysis.score.score)
      : null;
  const densityLabel =
    selection.layer === "density"
      ? `${selection.categorySelection.name} 점포 밀도`
      : "대표 시간대 수요";
  const activeDemand = (marketAnalysis.analysis ? market.demand[selection.activeHour] : null) ?? 0;
  const activeDemandLabel = market.demandLabels[selection.activeHour] ?? "시간 구간 미확인";
  const flowPeople = useMemo(
    () =>
      Array.from(
        { length: Math.max(3, Math.min(11, Math.round(activeDemand / 9))) },
        (_, index) => ({
          longitude: market.center[0] + (((index * 19) % 11) - 5) * 0.00018,
          latitude: market.center[1] + (((index * 13) % 9) - 4) * 0.00013,
          delay: index * -0.36,
        }),
      ),
    [activeDemand, market.center],
  );

  return {
    storeSelection,
    selectedStorefront3d,
    visibleStores,
    listedStores,
    mapStores,
    sameCategoryCount,
    categoryCoverageReason,
    score,
    densityLabel,
    activeDemand,
    activeDemandLabel,
    flowPeople,
  };
}

function useWorkspaceActions(
  catalogState: WorkspaceCatalog,
  selection: SelectionState,
  panels: PanelState,
  viewport: ViewportState,
  marketData: ReturnType<typeof useWorkspaceMarketData>,
  storefronts: ReturnType<typeof useWorkspaceStorefronts>,
) {
  function chooseMarket(nextMarket: MarketKey) {
    storefronts.storeSelection.clearSelection();
    selection.setMarketKey(nextMarket);
    viewport.focusCenter(catalogState.markets[nextMarket].center, false);
  }
  function chooseCategory(nextCategory: Category) {
    storefronts.storeSelection.clearSelection();
    selection.chooseCategory(nextCategory);
  }
  function chooseListedStore(storeName: string) {
    const store = storefronts.visibleStores.find((candidate) => candidate.name === storeName);
    storefronts.storeSelection.selectListedStore(storeName);
    panels.setInspectorOpen(true);
    if (store)
      selection.applyCategorySelection(storeCategorySelection(store.category, store.categoryCode));
  }
  function chooseSearchResult(result: MarketSearchResult) {
    const nextMarket = catalogState.marketKeyById[result.market_id];
    if (!nextMarket) return;
    selection.setMarketKey(nextMarket);
    storefronts.storeSelection.selectSearchResult(result);
    panels.setInspectorOpen(true);
    viewport.focusCenter([result.longitude, result.latitude], result.result_type === "store");
    if (result.result_type === "store")
      selection.applyCategorySelection(
        storeCategorySelection(result.category_name, result.category_code),
      );
  }
  function resetAnalysis() {
    storefronts.storeSelection.clearSelection();
    selection.resetSelection();
    viewport.resetViewport(marketData.market.center);
  }
  function togglePrefabMode() {
    viewport.setPrefabMode((current) => {
      const next = !current;
      viewport.mapRef.current?.easeTo({
        pitch: next ? 56 : 38,
        bearing: next ? -24 : -18,
        duration: 650,
        essential: true,
      });
      return next;
    });
  }
  function chooseLayer(nextLayer: LayerMode) {
    selection.setLayer(nextLayer);
  }

  return {
    chooseMarket,
    chooseCategory,
    chooseListedStore,
    chooseSearchResult,
    resetAnalysis,
    togglePrefabMode,
    chooseLayer,
  };
}

export function useProductWorkspaceModel(
  catalog: ProductCatalog,
  useDemoData: boolean,
  apiReadiness: { state: ApiReadinessState; retry: () => void },
) {
  const compactMap = useCompactMap();
  const catalogState = useWorkspaceCatalog(catalog);
  const selection = useAnalysisSelection(catalogState.initialUrlState);
  const panels = useWorkspacePanels(compactMap);
  const viewport = useMapViewport(catalogState.initialUrlState.center, !useDemoData);
  const marketData = useWorkspaceMarketData(
    catalog,
    catalogState,
    selection,
    useDemoData,
    useDemoData || apiReadiness.state === "ready",
  );
  const storefronts = useWorkspaceStorefronts(
    compactMap,
    catalogState,
    selection,
    viewport,
    marketData,
  );
  const actions = useWorkspaceActions(
    catalogState,
    selection,
    panels,
    viewport,
    marketData,
    storefronts,
  );

  return {
    catalog,
    apiReadiness,
    compactMap,
    catalogState,
    selection,
    panels,
    viewport,
    marketData,
    storefronts,
    actions,
  };
}

export type ProductWorkspaceModel = ReturnType<typeof useProductWorkspaceModel>;
