import { useEffect, useMemo } from "react";

import { useAnalysisPeriodNormalization } from "../analysis/useAnalysisPeriodNormalization";
import {
  restoreAnalysisSessionState,
  saveAnalysisSessionState,
} from "../analysis/analysisSessionState";
import { useNearbyStores } from "../analysis/useNearbyStores";
import { topCategorySelectionForStore } from "../market/categorySelection";
import { demandFromFlow } from "../market/model";
import type { Category, LayerMode, Market, MarketKey, MarketStore } from "../market/types";
import { useAnalysisSelection } from "../analysis/useAnalysisSelection";
import { useMarketAnalysis } from "../market/useMarketAnalysis";
import { useStoreSelection } from "../market/useStoreSelection";
import { buildStorefrontObjectField } from "../map/storefronts/storefrontObjectField";
import { useCompactMap } from "../map/useCompactMap";
import { useMapViewport } from "../map/useMapViewport";
import { useWorkspacePanels } from "./useWorkspacePanels";
import type { ApiReadinessState } from "../system/useApiReadiness";
import type { MarketSearchResult } from "../search/searchApi";
import type { ProductCatalog, SupportedMarket } from "../../services/productCatalog";
import { useIndustryTaxonomy } from "../market/useIndustryTaxonomy";

type SelectionState = ReturnType<typeof useAnalysisSelection>;
type PanelState = ReturnType<typeof useWorkspacePanels>;
type ViewportState = ReturnType<typeof useMapViewport>;

type WorkspaceCatalog = {
  markets: Record<MarketKey, Market>;
  marketKeyById: Record<string, MarketKey>;
  marketIdByKey: Record<MarketKey, string>;
  defaultMarket: SupportedMarket;
  initialAnalysisState: ReturnType<typeof createInitialAnalysisState>;
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

function createInitialAnalysisState(catalog: ProductCatalog) {
  const defaultMarket = catalog.markets[0];
  const defaultCategory = catalog.categories[0]?.name ?? "카페";
  return {
    marketKey: defaultMarket.key,
    category: defaultCategory,
    selectedCategoryName: defaultCategory,
    selectedCategoryCode: null,
    radius: catalog.radii.includes(300) ? 300 : catalog.radii[0],
    activeHour: 2,
    layer: "density" as const,
    scope: "market" as const,
    topic: "overview" as const,
    boundaryVisible: true,
    storesVisible: true,
    period: "",
    center: defaultMarket.center,
  };
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
  const initialAnalysisState = useMemo(() => createInitialAnalysisState(catalog), [catalog]);

  return {
    markets,
    marketKeyById,
    marketIdByKey,
    defaultMarket: catalog.markets[0],
    initialAnalysisState,
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
      taxonomyNodeId: /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(selection.categorySelection.code ?? "")
        ? selection.categorySelection.code : null,
    },
    apiReady,
  );
  useAnalysisPeriodNormalization({
    period: selection.period,
    availablePeriods: marketAnalysis.availablePeriods,
    defaultPeriod: marketAnalysis.defaultPeriod,
    onPeriodChange: selection.setPeriod,
  });

  useEffect(() => {
    if (!nearby.isStale) syncCategoryCoverage(nearby.data?.category_coverage);
  }, [nearby.data?.category_coverage, nearby.isStale, syncCategoryCoverage]);

  useEffect(() => {
    const responseMatchesCenter =
      !nearby.isStale &&
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
    nearby.isStale,
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
  const visibleStores = useMemo(() => {
    const sourceStores = nearbyMarketStores;
    return storeSelection.selectedSearchStore
      ? [
          storeSelection.selectedSearchStore,
          ...sourceStores.filter(
            (store) =>
              (store.id ?? store.name) !== storeSelection.selectedSearchStore?.id &&
              store.name !== storeSelection.selectedSearchStore?.name,
          ),
        ]
      : sourceStores;
  }, [nearbyMarketStores, storeSelection.selectedSearchStore]);
  const listedStores = visibleStores;
  const selectedCategoryStores = visibleStores;
  const storefrontBuildings3d = useMemo(
    () =>
      viewport.presentationMode === "storefront3d" && !viewport.storefront3dUnavailable
        ? buildStorefrontObjectField({
            stores: selectedCategoryStores,
            selected: storeSelection.selected,
            bounds: viewport.visibleMapBounds,
          })
        : [],
    [
      selectedCategoryStores,
      storeSelection.selected,
      viewport.presentationMode,
      viewport.storefront3dUnavailable,
      viewport.visibleMapBounds,
    ],
  );
  const mapStores = useMemo(
    () => selectedCategoryStores,
    [selectedCategoryStores],
  );
  const selectedStorefront3d = storefrontBuildings3d[0] ?? null;
  const sameCategoryCount = nearby.isStale ? 0 : (nearby.data?.same_category_count ?? 0);
  const categoryCoverageReason =
    !nearby.isStale &&
    nearby.data?.category_coverage.requested_category === selection.categorySelection.name
      ? nearby.data.category_coverage.status === "unavailable" &&
        nearby.data.same_category_count === 0
        ? `${market.name} 안에서 ${selection.categorySelection.name} 점포를 찾지 못했습니다. 세 상권 전체 순위와 현재 선택한 상권의 점포 수는 다를 수 있습니다.`
        : nearby.data.category_coverage.reason
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
  const activeDemand = marketAnalysis.analysis ? market.demand[selection.activeHour] : null;
  const activeDemandLabel = market.demandLabels[selection.activeHour] ?? "시간 구간 미확인";
  const flowPeople = useMemo(
    () =>
      activeDemand === null
        ? []
        : Array.from(
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
    storefrontBuildings3d,
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
    viewport.transitionToMarket(catalogState.markets[nextMarket].center, () => {
      selection.setMarketKey(nextMarket);
    });
  }
  function chooseCategory(nextCategory: Category) {
    storefronts.storeSelection.clearSelection();
    selection.chooseCategory(nextCategory);
  }
  function chooseTaxonomyCategory(name: string, nodeId: string, capability: "FULL" | "PARTIAL" | "NONE") {
    storefronts.storeSelection.clearSelection();
    selection.applyCategorySelection({
      name,
      code: nodeId,
      analysisCategory: null,
      coverage: capability === "FULL" ? "full" : capability === "PARTIAL" ? "partial" : "unavailable",
    });
  }
  function chooseListedStore(storeName: string) {
    const store = storefronts.visibleStores.find((candidate) => candidate.name === storeName);
    storefronts.storeSelection.selectListedStore(storeName);
    panels.setInspectorOpen(true);
    if (store)
      selection.applyCategorySelection(
        topCategorySelectionForStore(store.category, store.categoryCode),
      );
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
        topCategorySelectionForStore(result.category_name, result.category_code),
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
    chooseTaxonomyCategory,
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
  const taxonomy = useIndustryTaxonomy(useDemoData || apiReadiness.state === "ready");
  const catalogState = useWorkspaceCatalog(catalog);
  const initialAnalysisState = useMemo(
    () => restoreAnalysisSessionState(catalogState.initialAnalysisState, catalog),
    [catalog, catalogState.initialAnalysisState],
  );
  const selection = useAnalysisSelection(initialAnalysisState);
  const panels = useWorkspacePanels(compactMap);
  const viewport = useMapViewport(initialAnalysisState.center, !useDemoData);
  const marketData = useWorkspaceMarketData(
    catalog,
    catalogState,
    selection,
    useDemoData,
    useDemoData || apiReadiness.state === "ready",
  );
  const storefronts = useWorkspaceStorefronts(catalogState, selection, viewport, marketData);
  const actions = useWorkspaceActions(
    catalogState,
    selection,
    panels,
    viewport,
    marketData,
    storefronts,
  );

  useEffect(() => {
    saveAnalysisSessionState({
      marketKey: selection.marketKey,
      selectedCategoryName: selection.categorySelection.name,
      selectedCategoryCode: selection.categorySelection.code,
      radius: selection.radius,
      activeHour: selection.activeHour,
      layer: selection.layer,
      topic: selection.analysisTopic,
      boundaryVisible: selection.boundaryVisible,
      storesVisible: selection.storesVisible,
      period: selection.period,
    });
  }, [
    selection.activeHour,
    selection.analysisTopic,
    selection.boundaryVisible,
    selection.categorySelection.code,
    selection.categorySelection.name,
    selection.layer,
    selection.marketKey,
    selection.period,
    selection.radius,
    selection.storesVisible,
  ]);

  return {
    catalog,
    taxonomy,
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
