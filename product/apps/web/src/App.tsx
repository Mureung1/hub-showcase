import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Layers3,
  LocateFixed,
  MapPinned,
  Minus,
  PanelLeftOpen,
  PanelRightOpen,
  Plus,
  ScanLine,
  X,
} from "lucide-react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { AnalysisLocationControls } from "./features/analysis/AnalysisLocationControls";
import { DataPeriodSummary } from "./features/analysis/DataPeriodSummary";
import { readAnalysisUrlState } from "./features/analysis/analysisUrlState";
import type { AnalysisMoveMode, AnalysisRadius } from "./features/analysis/types";
import { useNearbyStores } from "./features/analysis/useNearbyStores";
import { useAnalysisUrlSync } from "./features/analysis/useAnalysisUrlSync";
import {
  CLUSTER_LABELS,
  categoryClass,
  circleFeature,
  demandFromFlow,
  isTestEnvironment,
} from "./features/market/model";
import {
  categoryMatchesSelection,
  quickCategorySelection,
  storeCategorySelection,
} from "./features/market/categorySelection";
import { MarketFilters } from "./features/market/MarketFilters";
import { MarketInspector } from "./features/market/MarketInspector";
import type {
  AnalysisScope,
  AnalysisTopic,
  Category,
  CategorySelection,
  LayerMode,
  MapMode,
  Market,
  MarketKey,
  MarketStore,
} from "./features/market/types";
import { useMarketAnalysis } from "./features/market/useMarketAnalysis";
import { useProductCatalog } from "./features/market/useProductCatalog";
import { MarketSearch } from "./features/search/MarketSearch";
import type { MarketSearchResult } from "./features/search/searchApi";
import {
  addMissingStyleImageFallback,
  BASE_BUILDING_LAYER_ID,
  BASE_MAP_STYLE_URL,
  shouldShowBaseBuildings,
} from "./features/map/baseMap";
import { SelectedMarketBoundary } from "./features/map/SelectedMarketBoundary";
import { findReadyOverlayRegion } from "./features/map/supportedRegions";
import { SupportedRegionOverlays } from "./features/map/SupportedRegionOverlays";
import type { SelectedStorefront } from "./features/map/storefronts/SelectedStorefrontLayer";
import { hasStorefrontVariant } from "./features/map/storefronts/storefrontRegistry";
import { selectMapStores } from "./features/map/storefronts/storefrontSelection";
import { useCompactMap } from "./features/map/useCompactMap";
import { useWorkspacePanels } from "./features/workspace/useWorkspacePanels";
import { useStoreSelection } from "./features/market/useStoreSelection";
import type { ScoreDecisionBlocker } from "./services/marketAnalysis";
import type { ProductCatalog, SupportedMarket } from "./services/productCatalog";
import "./styles/global.css";

const SceneWorkspace = lazy(() =>
  import("./components/SceneWorkspace").then((module) => ({ default: module.SceneWorkspace })),
);
const SelectedStorefrontLayer = lazy(() =>
  import("./features/map/storefronts/SelectedStorefrontLayer").then((module) => ({
    default: module.SelectedStorefrontLayer,
  })),
);

const SCORE_BLOCKER_LABELS: Record<ScoreDecisionBlocker, string> = {
  fixture_present: "개발용 fixture가 포함됨",
  coverage_below_60: "사용 가능한 지표가 60% 미만",
  confidence_below_60: "근거 신뢰도가 60% 미만",
  required_metric_missing: "매출 또는 유동 수요 필수 지표가 누락됨",
  peer_sample_too_small: "비교 상권 표본이 30개 미만이거나 확인되지 않음",
  cluster_evidence_too_weak: "업종 집적효과 근거가 충분하지 않음",
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

function PeriodSelect({
  periods,
  value,
  onChange,
}: {
  periods: string[];
  value: string;
  onChange: (period: string) => void;
}) {
  const options = periods.length > 0 ? periods : value ? [value] : [];
  return (
    <label className="header-control period-control">
      <span className="sr-only">분석 데이터 분기</span>
      <select
        aria-label="분석 데이터 분기"
        value={value}
        disabled={periods.length <= 1}
        title={
          periods.length <= 1
            ? "현재 적재된 완결 분기는 한 개입니다."
            : "분석할 완결 분기를 선택합니다."
        }
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((period) => (
          <option key={period} value={period}>
            {`${period.slice(0, 4)}.${period.slice(4)}Q 기준`}
          </option>
        ))}
        {!value && <option value="">분기 확인 중</option>}
      </select>
    </label>
  );
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
      scope: "radius",
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

export function App() {
  const { catalog, state, retry } = useProductCatalog();
  if (state === "loading")
    return <main className="app-bootstrap">지원 범위를 불러오는 중입니다.</main>;
  if (!catalog || catalog.markets.length === 0) {
    return (
      <main className="app-bootstrap" role="alert">
        <p>지원 범위를 불러오지 못했습니다.</p>
        <button type="button" onClick={retry}>
          다시 시도
        </button>
      </main>
    );
  }
  return <ProductWorkspace catalog={catalog} />;
}

function ProductWorkspace({ catalog }: { catalog: ProductCatalog }) {
  const compactMap = useCompactMap();
  const markets = useMemo(
    () =>
      Object.fromEntries(
        catalog.markets.map((supportedMarket) => [
          supportedMarket.key,
          emptyMarket(supportedMarket),
        ]),
      ) as Record<MarketKey, Market>,
    [catalog.markets],
  );
  const marketKeyById = useMemo(
    () => Object.fromEntries(catalog.markets.map((market) => [market.market_id, market.key])),
    [catalog.markets],
  );
  const marketIdByKey = useMemo(
    () => Object.fromEntries(catalog.markets.map((market) => [market.key, market.market_id])),
    [catalog.markets],
  );
  const defaultMarket = catalog.markets[0];
  const hasInitialUrlState = useMemo(() => window.location.search.length > 1, []);
  const initialUrlState = useMemo(() => initialAnalysisUrlState(catalog), [catalog]);
  const [marketKey, setMarketKey] = useState<MarketKey>(initialUrlState.marketKey);
  const [category, setCategory] = useState<Category>(initialUrlState.category);
  const [categorySelection, setCategorySelection] = useState<CategorySelection>(() =>
    storeCategorySelection(
      initialUrlState.selectedCategoryName,
      initialUrlState.selectedCategoryCode,
    ),
  );
  const [radius, setRadius] = useState<AnalysisRadius>(initialUrlState.radius);
  const [activeHour, setActiveHour] = useState(2);
  const {
    evidenceOpen,
    setEvidenceOpen,
    compareOpen,
    setCompareOpen,
    sceneOpen,
    setSceneOpen,
    filtersOpen,
    setFiltersOpen,
    inspectorOpen,
    setInspectorOpen,
    filterOpenButtonRef,
    inspectorOpenButtonRef,
  } = useWorkspacePanels(compactMap);
  const [layer, setLayer] = useState<LayerMode>(initialUrlState.layer);
  const [analysisScope, setAnalysisScope] = useState<AnalysisScope>(initialUrlState.scope);
  const [analysisTopic, setAnalysisTopic] = useState<AnalysisTopic>(initialUrlState.topic);
  const [boundaryVisible, setBoundaryVisible] = useState(initialUrlState.boundaryVisible);
  const [storesVisible, setStoresVisible] = useState(initialUrlState.storesVisible);
  const [period, setPeriod] = useState(initialUrlState.period);
  const [mapMode, setMapMode] = useState<MapMode>("localtwin");
  const [prefabMode, setPrefabMode] = useState(true);
  const [storefront3dUnavailable, setStorefront3dUnavailable] = useState(false);
  const [baseBuildingsVisible, setBaseBuildingsVisible] = useState(true);
  const [committedCenter, setCommittedCenter] = useState<[number, number]>(initialUrlState.center);
  const [draftCenter, setDraftCenter] = useState<[number, number] | null>(null);
  const [analysisMoveMode, setAnalysisMoveMode] = useState<AnalysisMoveMode>("idle");
  const [visibleMapCenter, setVisibleMapCenter] = useState<[number, number]>(
    initialUrlState.center,
  );
  const mapRef = useRef<MapRef>(null);
  const visibleSupportedRegion = useMemo(
    () => findReadyOverlayRegion(visibleMapCenter),
    [visibleMapCenter],
  );
  const baseBuildingsRendered = shouldShowBaseBuildings(
    baseBuildingsVisible,
    mapMode,
    visibleSupportedRegion !== undefined,
  );
  const {
    analysis,
    analysisSource,
    analysisState,
    comparison,
    background,
    backgroundState,
    availablePeriods,
    defaultPeriod,
    retryAnalysis,
  } = useMarketAnalysis(
    catalog.markets.find((market) => market.key === marketKey) ?? defaultMarket,
    catalog.markets,
    categorySelection.coverage === "full" ? categorySelection.analysisCategory : null,
    period,
  );
  const nearby = useNearbyStores({
    center: committedCenter,
    radius,
    category: categorySelection.name,
  });
  const { enableUrlSync, resetUrl } = useAnalysisUrlSync({
    initialEnabled: hasInitialUrlState,
    state: {
      marketKey,
      category,
      selectedCategoryName: categorySelection.name,
      selectedCategoryCode: categorySelection.code,
      radius,
      layer,
      scope: analysisScope,
      topic: analysisTopic,
      boundaryVisible,
      storesVisible,
      period,
      center: committedCenter,
    },
    availablePeriods,
    defaultPeriod,
    onPeriodChange: setPeriod,
  });

  useEffect(() => {
    const coverage = nearby.data?.category_coverage;
    if (!coverage || coverage.requested_category !== categorySelection.name) return;
    if (
      coverage.status === categorySelection.coverage &&
      coverage.analysis_category === categorySelection.analysisCategory
    ) {
      return;
    }
    setCategorySelection((current) => ({
      ...current,
      coverage: coverage.status,
      analysisCategory: coverage.analysis_category,
    }));
  }, [
    categorySelection.analysisCategory,
    categorySelection.coverage,
    categorySelection.name,
    nearby.data,
  ]);

  useEffect(() => {
    const responseMatchesCenter =
      nearby.data &&
      Math.abs(nearby.data.center.longitude - committedCenter[0]) < 0.000001 &&
      Math.abs(nearby.data.center.latitude - committedCenter[1]) < 0.000001;
    const responseMarket =
      responseMatchesCenter && nearby.data ? marketKeyById[nearby.data.market_id] : undefined;
    if (responseMarket && responseMarket !== marketKey) setMarketKey(responseMarket);
  }, [committedCenter, marketKey, marketKeyById, nearby.data]);

  const market = useMemo(() => {
    const base = markets[marketKey];
    if (!analysis) return base;
    const flow = analysis.raw.total_flow;
    const reason = analysis.score.reasons
      .slice(0, 2)
      .map((item) => item.message)
      .join(" ");
    return {
      ...base,
      score: Math.round(analysis.score.score),
      grade: `${analysis.score.band} · 신뢰도 ${analysis.score.confidence_label}`,
      footfall: flow == null ? "미수집" : `${Math.round(flow).toLocaleString("ko-KR")}명/분기`,
      workPopulation: background
        ? `${background.market_workers.value.toLocaleString("ko-KR")}명`
        : "조회 중",
      residentPopulation: background
        ? `${background.market_resident_population.value.toLocaleString("ko-KR")}명`
        : "조회 중",
      opening: analysis.raw.opening_count,
      closing: analysis.raw.closure_count,
      demand: demandFromFlow(analysis.raw.flow_time_buckets),
      demandLabels: analysis.raw.flow_time_buckets.map((bucket) => bucket.label),
      insight: reason || analysis.score.cluster.explanation,
    };
  }, [analysis, background, marketKey, markets]);
  const score =
    categorySelection.coverage !== "full"
      ? null
      : analysis
        ? Math.round(analysis.score.score)
        : null;
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
  const {
    selectedSearchResult,
    selectedSearchStore,
    selected,
    clearSelection,
    selectListedStore,
    selectSearchResult,
  } = useStoreSelection({
    marketKey,
    marketKeyById,
    score: market.score,
    analysisScope,
    nearbyStores: nearbyMarketStores,
    marketStores: market.stores,
  });
  const selectedStorefront3d = useMemo<SelectedStorefront | null>(() => {
    if (
      !prefabMode ||
      storefront3dUnavailable ||
      mapMode !== "localtwin" ||
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
  }, [mapMode, prefabMode, selectedSearchResult, storefront3dUnavailable]);
  const visibleStores = useMemo(() => {
    const sourceStores = analysisScope === "radius" ? nearbyMarketStores : [];
    const stores = selectedSearchStore
      ? [
          selectedSearchStore,
          ...sourceStores.filter(
            (store) =>
              (store.id ?? store.name) !== selectedSearchStore.id &&
              store.name !== selectedSearchStore.name,
          ),
        ]
      : sourceStores;
    const orderedStores = [
      ...stores.filter((store) => categoryMatchesSelection(store.category, categorySelection)),
      ...stores.filter((store) => !categoryMatchesSelection(store.category, categorySelection)),
    ];
    return selectedStorefront3d
      ? orderedStores.filter((store) => (store.id ?? store.name) !== selectedStorefront3d.id)
      : orderedStores;
  }, [
    analysisScope,
    categorySelection,
    nearbyMarketStores,
    selectedSearchStore,
    selectedStorefront3d,
  ]);
  const listedStores = useMemo(
    () =>
      visibleStores.filter((store) => categoryMatchesSelection(store.category, categorySelection)),
    [categorySelection, visibleStores],
  );
  const mapStores = useMemo(() => {
    return selectMapStores(visibleStores, {
      selectedName: selected?.name ?? null,
      focus: selectedStorefront3d
        ? [selectedStorefront3d.longitude, selectedStorefront3d.latitude]
        : null,
      limit: compactMap ? 6 : 12,
      minimumDistanceMeters: selectedStorefront3d ? (compactMap ? 125 : 105) : compactMap ? 55 : 40,
    });
  }, [compactMap, selected?.name, selectedStorefront3d, visibleStores]);
  const sameCategoryCount =
    analysisScope === "radius"
      ? (nearby.data?.same_category_count ?? 0)
      : ((categorySelection.coverage === "full" ? analysis?.raw.category_store_count : null) ?? 0);
  const categoryCoverageReason =
    nearby.data?.category_coverage.requested_category === categorySelection.name
      ? nearby.data.category_coverage.reason
      : categorySelection.coverage === "full"
        ? "선택 업종은 현재 상권 분석 지표를 모두 지원합니다."
        : categorySelection.coverage === "partial"
          ? "해당 세부 업종은 점포 위치와 반경 경쟁 지표만 제공합니다."
          : "선택 범위에서 해당 업종의 분석 근거를 확인할 수 없습니다.";
  const densityLabel =
    layer === "density" ? `${categorySelection.name} 점포 밀도` : "대표 시간대 수요";
  const analysisCenter = draftCenter ?? committedCenter;
  const draftSupportedRegion = draftCenter ? findReadyOverlayRegion(draftCenter) : undefined;
  const circle = useMemo(() => circleFeature(analysisCenter, radius), [analysisCenter, radius]);
  const activeDemand = (analysis ? market.demand[activeHour] : null) ?? 0;
  const activeDemandLabel = market.demandLabels[activeHour] ?? "시간 구간 미확인";
  const flowPeople = useMemo(
    () =>
      Array.from(
        { length: Math.max(3, Math.min(11, Math.round(activeDemand / 9))) },
        (_, index) => ({
          longitude: analysisCenter[0] + (((index * 19) % 11) - 5) * 0.00018,
          latitude: analysisCenter[1] + (((index * 13) % 9) - 4) * 0.00013,
          delay: index * -0.36,
        }),
      ),
    [activeDemand, analysisCenter],
  );

  useEffect(() => {
    mapRef.current?.flyTo({
      center: committedCenter,
      zoom: selectedSearchResult?.result_type === "store" ? 16.8 : 15.4,
      pitch: 52,
      bearing: -24,
      duration: 900,
      essential: true,
    });
  }, [committedCenter, selectedSearchResult]);

  function chooseMarket(nextMarket: MarketKey) {
    enableUrlSync();
    clearSelection();
    setMarketKey(nextMarket);
    setCommittedCenter(markets[nextMarket].center);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
  }

  function applyCategorySelection(nextSelection: CategorySelection) {
    setCategorySelection(nextSelection);
    if (nextSelection.analysisCategory) setCategory(nextSelection.analysisCategory);
    if (nextSelection.coverage !== "full") {
      setAnalysisScope("radius");
      setAnalysisTopic("competition");
      setLayer("density");
    }
  }

  function chooseCategory(nextCategory: Category) {
    enableUrlSync();
    clearSelection();
    setCategory(nextCategory);
    setCategorySelection(quickCategorySelection(nextCategory));
  }

  function chooseListedStore(storeName: string) {
    const store = visibleStores.find((candidate) => candidate.name === storeName);
    enableUrlSync();
    selectListedStore(storeName);
    setInspectorOpen(true);
    if (store) applyCategorySelection(storeCategorySelection(store.category, store.categoryCode));
  }

  function chooseSearchResult(result: MarketSearchResult) {
    const nextMarket = marketKeyById[result.market_id];
    if (!nextMarket) return;
    enableUrlSync();
    setMarketKey(nextMarket);
    selectSearchResult(result);
    setInspectorOpen(true);
    setCommittedCenter([result.longitude, result.latitude]);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    if (result.result_type === "store") {
      setAnalysisScope("radius");
      applyCategorySelection(storeCategorySelection(result.category_name, result.category_code));
    }
  }

  function chooseMapMode(nextMode: MapMode) {
    setMapMode(nextMode);
  }

  function resetAnalysis() {
    clearSelection();
    resetUrl();
    setCategory("카페");
    setCategorySelection(quickCategorySelection("카페"));
    setRadius(300);
    setLayer("density");
    setAnalysisScope("radius");
    setAnalysisTopic("overview");
    setBoundaryVisible(true);
    setStoresVisible(true);
    setMapMode("localtwin");
    setPrefabMode(true);
    setBaseBuildingsVisible(true);
    setCommittedCenter(market.center);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    mapRef.current?.easeTo({
      center: market.center,
      zoom: 15.4,
      pitch: 52,
      bearing: -24,
      duration: 650,
      essential: true,
    });
  }

  function startAnalysisMove() {
    setDraftCenter(visibleMapCenter);
    setAnalysisMoveMode("moving");
  }

  function cancelAnalysisMove() {
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    mapRef.current?.easeTo({ center: committedCenter, duration: 450, essential: true });
  }

  function confirmAnalysisMove() {
    if (!draftCenter || !draftSupportedRegion) return;
    enableUrlSync();
    clearSelection();
    setCommittedCenter(draftCenter);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
  }

  function chooseRadius(nextRadius: AnalysisRadius) {
    enableUrlSync();
    clearSelection();
    setRadius(nextRadius);
  }

  function chooseLayer(nextLayer: LayerMode) {
    enableUrlSync();
    setLayer(nextLayer);
  }

  function chooseScope(nextScope: AnalysisScope) {
    enableUrlSync();
    clearSelection();
    setAnalysisScope(nextScope);
  }

  return (
    <main
      className="app-shell"
      data-storefront-3d-state={
        storefront3dUnavailable ? "fallback" : selectedStorefront3d ? "selected" : "idle"
      }
    >
      <header className="app-header">
        <a className="brand" href="#analysis" aria-label="LocalTwin 상권 분석 홈">
          <span className="brand-mark">
            <span />
          </span>
          <span>LocalTwin</span>
        </a>
        <nav className="primary-nav" aria-label="주요 메뉴">
          <button className="nav-item is-active" type="button">
            상권 분석
          </button>
          <button className="nav-item" type="button" onClick={() => setCompareOpen(true)}>
            상권 비교
          </button>
          <button className="nav-item" type="button" onClick={() => setFiltersOpen(true)}>
            분석 조건
          </button>
          <button className="nav-item" type="button" onClick={() => setEvidenceOpen(true)}>
            데이터 기준
          </button>
          <button className="nav-item" type="button" onClick={() => window.print()}>
            보고서
          </button>
        </nav>
        <div className="header-actions">
          <a
            className="header-control header-docs"
            href={
              import.meta.env.VITE_DOCS_URL ??
              "https://hub-localtwin-docs-vercel.vercel.app/docs/wiki/doc-viewer.html?doc=Home.md"
            }
          >
            <FileText size={16} /> Docs
          </a>
          <button className="header-control" type="button" onClick={() => setFiltersOpen(true)}>
            <MapPinned size={16} /> 상권 선택: {marketKey}
          </button>
          <PeriodSelect
            periods={availablePeriods}
            value={period}
            onChange={(nextPeriod) => {
              setPeriod(nextPeriod);
              enableUrlSync();
            }}
          />
          <button
            className="icon-button"
            type="button"
            title="데이터 도움말"
            onClick={() => setEvidenceOpen(true)}
          >
            <CircleHelp size={19} />
          </button>
        </div>
      </header>

      <section className="demo-note" aria-label="데모 데이터 안내">
        <span className="pulse-dot" />
        {analysisState === "loading"
          ? "서울 상권분석 공식 데이터를 불러오는 중입니다."
          : analysisState === "error"
            ? "상권 분석 API에 연결하지 못했습니다. 예시 값으로 대체하지 않았습니다."
            : analysisState === "unavailable"
              ? `${categorySelection.name}은 점포 위치와 반경 경쟁 지표만 제공합니다.`
              : analysisSource === "demo"
                ? "Demo mode · 검증 snapshot 예시이며 실제 조회 결과가 아닙니다."
                : `서울 상권분석 ${period.slice(0, 4)}년 ${period.slice(4)}분기 API 결과입니다.`}{" "}
        {analysisState === "error" && (
          <button type="button" onClick={retryAnalysis}>
            다시 시도
          </button>
        )}
        <button type="button" onClick={() => setEvidenceOpen(true)}>
          데이터 범위 보기
        </button>
      </section>

      <section
        id="analysis"
        className={`analysis-layout ${filtersOpen ? "" : "is-filter-closed"} ${inspectorOpen ? "" : "is-inspector-closed"}`}
        aria-label="상권 분석 작업 공간"
      >
        {filtersOpen && (
          <MarketFilters
            marketKey={marketKey}
            markets={markets}
            supportedCategories={catalog.categories.map((item) => item.name)}
            supportedRadii={catalog.radii}
            category={
              categorySelection.coverage === "full" ? categorySelection.analysisCategory : null
            }
            categorySelection={categorySelection}
            categoryCoverageReason={categoryCoverageReason}
            radius={radius}
            layer={layer}
            scope={analysisScope}
            topic={analysisTopic}
            boundaryVisible={boundaryVisible}
            storesVisible={storesVisible}
            usesAnalysis={categorySelection.coverage === "full" && analysis !== null}
            visibleStores={listedStores}
            selectedStoreName={selected?.name ?? null}
            nearbyState={analysisScope === "radius" ? nearby.state : "ready"}
            onNearbyRetry={nearby.retry}
            onClose={() => setFiltersOpen(false)}
            onReset={resetAnalysis}
            onMarketChange={chooseMarket}
            onRadiusChange={chooseRadius}
            onCategoryChange={chooseCategory}
            onLayerChange={chooseLayer}
            onScopeChange={chooseScope}
            onTopicChange={(nextTopic) => {
              enableUrlSync();
              setAnalysisTopic(nextTopic);
              if (nextTopic === "flow") setLayer("demand");
              if (nextTopic === "competition") setLayer("density");
            }}
            onBoundaryVisibleChange={(visible) => {
              enableUrlSync();
              setBoundaryVisible(visible);
            }}
            onStoresVisibleChange={(visible) => {
              enableUrlSync();
              setStoresVisible(visible);
            }}
            onStoreChange={chooseListedStore}
          />
        )}

        <section className="map-panel" aria-label="지도와 상권 분포">
          <div className="map-toolbar">
            <MarketSearch onSelect={chooseSearchResult} />
            <div className="map-toolbar-actions">
              {!filtersOpen && (
                <button
                  ref={filterOpenButtonRef}
                  type="button"
                  className="glass-button panel-open-button"
                  onClick={() => setFiltersOpen(true)}
                >
                  <PanelLeftOpen size={16} /> 분석 조건 열기
                </button>
              )}
              {!inspectorOpen && (
                <button
                  ref={inspectorOpenButtonRef}
                  type="button"
                  className="glass-button panel-open-button"
                  onClick={() => setInspectorOpen(true)}
                >
                  <PanelRightOpen size={16} /> 분석 결과 열기
                </button>
              )}
              <div className="map-mode-switch" role="group" aria-label="지도 표현 방식">
                <button
                  type="button"
                  className={mapMode === "localtwin" ? "is-selected" : ""}
                  aria-pressed={mapMode === "localtwin"}
                  title="LocalTwin 2.5D 지도"
                  onClick={() => chooseMapMode("localtwin")}
                >
                  <Layers3 size={15} /> <span>LocalTwin</span>
                </button>
                <button
                  type="button"
                  className={mapMode === "original" ? "is-selected" : ""}
                  aria-pressed={mapMode === "original"}
                  title="실제 지도 원본"
                  onClick={() => chooseMapMode("original")}
                >
                  <MapPinned size={15} /> <span>실제 지도</span>
                </button>
              </div>
              <button
                type="button"
                className="glass-button"
                onClick={() => setLayer(layer === "density" ? "demand" : "density")}
              >
                <Layers3 size={16} /> {densityLabel}
              </button>
            </div>
          </div>
          <button type="button" className="scene-entry-button" onClick={() => setSceneOpen(true)}>
            <ScanLine size={16} />
            <span>관평동 3D 장소</span>
            <small>촬영 전</small>
            <ChevronRight className="scene-entry-chevron" size={15} />
          </button>
          {isTestEnvironment() ? (
            <div className="map-fallback">실제 지도는 브라우저 환경에서 표시됩니다.</div>
          ) : (
            <div className="live-map">
              <Map
                ref={mapRef}
                initialViewState={{
                  longitude: market.center[0],
                  latitude: market.center[1],
                  zoom: 15.4,
                  pitch: 38,
                  bearing: -18,
                }}
                mapStyle={BASE_MAP_STYLE_URL}
                attributionControl={false}
                dragPan
                scrollZoom
                touchZoomRotate
                onLoad={(event) => {
                  event.target.on("styleimagemissing", addMissingStyleImageFallback);
                }}
                onMove={(event) => {
                  const nextCenter: [number, number] = [
                    event.viewState.longitude,
                    event.viewState.latitude,
                  ];
                  setVisibleMapCenter(nextCenter);
                  if (analysisMoveMode === "moving") setDraftCenter(nextCenter);
                }}
              >
                <Layer
                  id={BASE_BUILDING_LAYER_ID}
                  type="fill-extrusion"
                  source="openmaptiles"
                  source-layer="building"
                  minzoom={14}
                  beforeId="boundary_3"
                  layout={{ visibility: baseBuildingsRendered ? "visible" : "none" }}
                  paint={{
                    "fill-extrusion-base": ["to-number", ["get", "render_min_height"], 0],
                    "fill-extrusion-color": "hsl(35, 8%, 85%)",
                    "fill-extrusion-height": ["to-number", ["get", "render_height"], 8],
                    "fill-extrusion-opacity": 0.8,
                    "fill-extrusion-vertical-gradient": true,
                  }}
                />
                {mapMode === "localtwin" && (
                  <SupportedRegionOverlays buildingsVisible={baseBuildingsVisible} />
                )}
                {analysisScope === "radius" && (
                  <Source id="analysis-area" type="geojson" data={circle}>
                    <Layer
                      id="analysis-area-fill"
                      type="fill"
                      paint={{
                        "fill-color": layer === "density" ? "#4fa76a" : "#4d8fdc",
                        "fill-opacity": 0.14,
                      }}
                    />
                    <Layer
                      id="analysis-area-line"
                      type="line"
                      paint={{ "line-color": "#ffffff", "line-width": 2.4, "line-opacity": 0.96 }}
                    />
                  </Source>
                )}
                {boundaryVisible && <SelectedMarketBoundary marketId={marketIdByKey[marketKey]} />}
                {storesVisible && selectedStorefront3d && (
                  <Suspense fallback={null}>
                    <SelectedStorefrontLayer
                      store={selectedStorefront3d}
                      onUnavailable={() => setStorefront3dUnavailable(true)}
                    />
                  </Suspense>
                )}
                {analysisScope === "radius" && (
                  <Marker
                    longitude={analysisCenter[0]}
                    latitude={analysisCenter[1]}
                    anchor="center"
                  >
                    <span
                      className={`analysis-center ${selectedStorefront3d ? "is-storefront-clear" : ""}`}
                    >
                      <span>{radius}m</span>
                    </span>
                  </Marker>
                )}
                {market.landmarks.map((place) => (
                  <Marker
                    key={place.name}
                    longitude={place.longitude}
                    latitude={place.latitude}
                    anchor="bottom"
                  >
                    <span className="landmark-label">{place.name}</span>
                  </Marker>
                ))}
                {layer === "demand" &&
                  flowPeople.map((person, index) => (
                    <Marker
                      key={`${activeHour}-${index}`}
                      longitude={person.longitude}
                      latitude={person.latitude}
                      anchor="center"
                    >
                      <span
                        className="flow-person"
                        style={{ animationDelay: `${person.delay}s` }}
                        aria-label={`${activeDemandLabel} 유동 수요`}
                      />
                    </Marker>
                  ))}
                {storesVisible &&
                  mapStores.map((store) => {
                    const isFeaturedStore = selected?.name === store.name;
                    const showsPrefab = prefabMode && isFeaturedStore;
                    return (
                      <Marker
                        key={store.id ?? `${store.name}:${store.longitude}:${store.latitude}`}
                        longitude={store.longitude}
                        latitude={store.latitude}
                        anchor="bottom"
                      >
                        <button
                          type="button"
                          aria-label={`${store.name} 후보 보기`}
                          className={
                            showsPrefab
                              ? `prefab-building ${categoryClass(store.category)} ${selected?.name === store.name ? "is-selected" : ""}`
                              : `map-marker ${categoryClass(store.category)} ${selected?.name === store.name ? "is-selected" : ""}`
                          }
                          onClick={() => chooseListedStore(store.name)}
                        >
                          {showsPrefab ? (
                            <>
                              <span className="prefab-shadow" />
                              <span className="prefab-side" />
                              <span className="prefab-face">
                                <i>
                                  {store.category === "카페"
                                    ? "☕"
                                    : store.category === "음식점"
                                      ? "⌁"
                                      : store.category === "베이커리"
                                        ? "✦"
                                        : "+"}
                                </i>
                              </span>
                              <span className="prefab-awning" />
                              <span className="prefab-door" />
                              <span className="prefab-sign" />
                              <span className="prefab-planter" />
                              <span className="prefab-roof" />
                              <span className="prefab-chimney" />
                            </>
                          ) : (
                            <span>
                              {store.category === "카페"
                                ? "☕"
                                : store.category === "음식점"
                                  ? "⌁"
                                  : store.category === "베이커리"
                                    ? "✦"
                                    : "+"}
                            </span>
                          )}
                        </button>
                      </Marker>
                    );
                  })}
                {selected && (
                  <Marker
                    longitude={selected.longitude}
                    latitude={selected.latitude}
                    anchor="bottom-left"
                    offset={[46, -56]}
                  >
                    <div className="selected-location">
                      <span className="pin-head">{score}</span>
                      <div>
                        <b>{selected.name}</b>
                        <small>
                          {selected.category} · {selected.distance}
                        </small>
                        <button type="button" onClick={() => setEvidenceOpen(true)}>
                          근거 보기 <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </Marker>
                )}
              </Map>
              {!visibleSupportedRegion && (
                <div className="map-support-status" role="status">
                  <b>LocalTwin 분석 지원 범위 밖</b>
                  <span>기본 지도는 계속 탐색할 수 있으며 새 분석은 지원 지역에서 시작합니다.</span>
                </div>
              )}
              {analysisScope === "radius" && (
                <AnalysisLocationControls
                  mode={analysisMoveMode}
                  canConfirm={draftSupportedRegion !== undefined}
                  onStart={startAnalysisMove}
                  onConfirm={confirmAnalysisMove}
                  onCancel={cancelAnalysisMove}
                />
              )}
            </div>
          )}
          <div className="map-legend">
            <p>{layer === "density" ? "동일 업종 밀도" : "대표 시간대 수요"}</p>
            <span>
              <i className="low" /> 낮음
            </span>
            <span>
              <i className="mid" /> 보통
            </span>
            <span>
              <i className="high" /> 높음
            </span>
          </div>
          <div className="map-attribution">
            {mapMode === "localtwin" ? "OpenFreeMap · LocalTwin map data overlay" : "OpenFreeMap"} ·
            © OpenStreetMap contributors
          </div>
          {layer === "demand" && (
            <div className="flow-card">
              <span>시간대 유동 수요</span>
              <b>
                {activeDemandLabel} · {activeDemand}/100
              </b>
              <small>아이콘 수는 상대 수요 비율을 표시합니다.</small>
            </div>
          )}
          <div className="map-controls">
            <button
              type="button"
              title="현재 상권으로 이동"
              onClick={() =>
                mapRef.current?.flyTo({
                  center: market.center,
                  zoom: 15.4,
                  pitch: 38,
                  bearing: -18,
                  essential: true,
                })
              }
            >
              <LocateFixed size={18} />
            </button>
            <button
              type="button"
              className={baseBuildingsVisible ? "is-active" : ""}
              title="건물 레이어 표시"
              aria-label="건물 레이어 표시"
              aria-pressed={baseBuildingsVisible}
              onClick={() => setBaseBuildingsVisible((current) => !current)}
            >
              <Building2 size={17} />
            </button>
            <button type="button" title="확대" onClick={() => mapRef.current?.zoomIn()}>
              <Plus size={18} />
            </button>
            <button type="button" title="축소" onClick={() => mapRef.current?.zoomOut()}>
              <Minus size={18} />
            </button>
            <button
              type="button"
              className={`three-d ${prefabMode ? "is-active" : ""}`}
              aria-pressed={prefabMode}
              onClick={() =>
                setPrefabMode((current) => {
                  const next = !current;
                  mapRef.current?.easeTo({
                    pitch: next ? 56 : 38,
                    bearing: next ? -24 : -18,
                    duration: 650,
                    essential: true,
                  });
                  return next;
                })
              }
            >
              3D
            </button>
          </div>
          <button
            type="button"
            className="compare-cta"
            disabled={categorySelection.coverage !== "full"}
            title={
              categorySelection.coverage === "full"
                ? undefined
                : "전체 지원 업종에서만 상권 비교를 제공합니다."
            }
            onClick={() => setCompareOpen(true)}
          >
            <BarChart3 size={17} /> 상권 비교 열기
          </button>
        </section>

        {inspectorOpen && (
          <MarketInspector
            market={market}
            selected={selected}
            score={score}
            categorySelection={categorySelection}
            categoryCoverageReason={categoryCoverageReason}
            radius={radius}
            activeHour={activeHour}
            sameCategoryCount={sameCategoryCount}
            analysis={analysis}
            background={background}
            backgroundState={backgroundState}
            analysisState={analysisState}
            analysisScope={analysisScope}
            topic={analysisTopic}
            onAnalysisRetry={retryAnalysis}
            onClosePanel={() => setInspectorOpen(false)}
            onClearSelection={() => {
              clearSelection();
            }}
            onEvidenceOpen={() => setEvidenceOpen(true)}
            onActiveHourChange={setActiveHour}
          />
        )}
      </section>

      {evidenceOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setEvidenceOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="데이터 산정 근거"
            className="evidence-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="데이터 산정 근거 닫기"
              onClick={() => setEvidenceOpen(false)}
            >
              <X size={20} />
            </button>
            <p className="modal-eyebrow">EVIDENCE · SOURCE PERIODS</p>
            <h2>이 화면의 숫자는 이렇게 읽습니다.</h2>
            <DataPeriodSummary
              analysis={analysis}
              background={background}
              nearbyEvidence={nearby.data?.evidence ?? []}
            />
            <div className="evidence-grid">
              {analysis && (
                <>
                  <div>
                    <span>현재 판정</span>
                    <b>
                      {analysis.score.band} · 신뢰도 {analysis.score.confidence}%
                    </b>
                    <p>
                      {analysis.score.decision_status === "supported"
                        ? "현재 근거 범위에서 비교 판단을 지원합니다."
                        : `근거가 충분하지 않습니다. ${analysis.score.decision_blockers
                            .map((blocker) => SCORE_BLOCKER_LABELS[blocker])
                            .join(" · ")}`}
                    </p>
                  </div>
                  <div>
                    <span>데이터 반영 범위</span>
                    <b>{analysis.score.data_coverage}%</b>
                    <p>
                      누락 지표는 0점으로 단정하지 않고 component별 50점 중립값 방향으로
                      수축했습니다.
                    </p>
                  </div>
                  <div>
                    <span>특수상권 판정</span>
                    <b>
                      {CLUSTER_LABELS[analysis.score.cluster.classification] ??
                        analysis.score.cluster.classification}
                    </b>
                    <p>{analysis.score.cluster.explanation}</p>
                  </div>
                  {analysis.score.reasons.slice(0, 3).map((reason) => (
                    <div key={`${reason.label}-${reason.tone}`}>
                      <span>
                        {reason.tone === "positive"
                          ? "긍정 근거"
                          : reason.tone === "caution"
                            ? "주의 근거"
                            : "참고 근거"}
                      </span>
                      <b>
                        {reason.label} · {reason.value.toLocaleString("ko-KR")}
                        {reason.unit}
                      </b>
                      <p>
                        {reason.message} 출처: {reason.source_name}, {reason.period}.
                      </p>
                    </div>
                  ))}
                  {analysis.score.limitations.length > 0 && (
                    <div>
                      <span>데이터 한계</span>
                      <b>누락 지표를 0점으로 처리하지 않음</b>
                      <p>{analysis.score.limitations.join(" ")}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <span>상권 변화</span>
                <b>서울시 상권분석서비스</b>
                <p>
                  개업·폐업은 상권·서비스업종 단위 집계입니다. 개별 점포의 경영 상태로 해석하지
                  않습니다.
                </p>
              </div>
              <div>
                <span>시간대 수요</span>
                <b>서울시 길단위인구 집계</b>
                <p>
                  6개 시간대 공식 집계를 0~100으로 정규화해 표시합니다. 개인 이동 정보가 아닙니다.
                </p>
              </div>
              <div>
                <span>입지 점수</span>
                <b>LocalTwin score v{analysis?.score.formula_version ?? "1.1.0"}</b>
                <p>
                  서울 peer 백분위의 수요·점포당 매출·폐업·업종 밀도·순증률만 반영합니다.
                  {analysis ? ` 현재 근거 신뢰도는 ${analysis.score.confidence}%입니다.` : ""}
                </p>
              </div>
              <div>
                <span>분석 범위</span>
                <b>
                  {market.name} · {category}
                </b>
                <p>
                  지도 탐색 반경은 {radius}m이며, 우측 상권 집계의 현재 응답 기간은
                  {analysis ? ` ${analysis.period}` : " 확인되지 않았습니다"}.
                </p>
              </div>
            </div>
            <button type="button" className="primary-action" onClick={() => setEvidenceOpen(false)}>
              확인
            </button>
          </section>
        </div>
      )}

      {compareOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={() => setCompareOpen(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="상권 비교"
            className="compare-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="상권 비교 닫기"
              onClick={() => setCompareOpen(false)}
            >
              <X size={20} />
            </button>
            <p className="modal-eyebrow">LOCATION COMPARISON</p>
            <h2>같은 조건에서 후보 상권을 비교합니다.</h2>
            <p className="modal-description">
              {category} · 반경 {radius}m · 2025년 1분기 기준
            </p>
            <div className="compare-table">
              {(Object.keys(markets) as MarketKey[]).map((key) => {
                const item = markets[key];
                const actual = comparison?.[key];
                const itemScore = actual ? Math.round(actual.score.score) : null;
                const itemFlow = actual?.raw.total_flow;
                const netOpening = actual
                  ? actual.raw.opening_count - actual.raw.closure_count
                  : null;
                return (
                  <button
                    key={key}
                    type="button"
                    className={key === marketKey ? "compare-row selected" : "compare-row"}
                    onClick={() => {
                      chooseMarket(key);
                      setCompareOpen(false);
                    }}
                  >
                    <span>{item.name}</span>
                    <b>{itemScore ?? "—"}</b>
                    <small>
                      유동{" "}
                      {itemFlow == null
                        ? "조회 전"
                        : `${Math.round(itemFlow).toLocaleString("ko-KR")}명/분기`}{" "}
                      · 순증{" "}
                      {netOpening == null ? "—" : `${netOpening > 0 ? "+" : ""}${netOpening}`}
                    </small>
                  </button>
                );
              })}
            </div>
            <p className="modal-footnote">
              서로 다른 상권 유형을 비교할 때는 점수보다 각 지표와 데이터 범위를 함께 확인하세요.
            </p>
          </section>
        </div>
      )}

      {sceneOpen && (
        <Suspense
          fallback={
            <div className="scene-loading" role="status">
              3D 장소 도구를 불러오는 중입니다.
            </div>
          }
        >
          <SceneWorkspace onClose={() => setSceneOpen(false)} />
        </Suspense>
      )}
    </main>
  );
}

export default App;
