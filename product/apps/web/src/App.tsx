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
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { SceneWorkspace } from "./components/SceneWorkspace";
import { AnalysisLocationControls } from "./features/analysis/AnalysisLocationControls";
import { DataPeriodSummary } from "./features/analysis/DataPeriodSummary";
import { readAnalysisUrlState, writeAnalysisUrlState } from "./features/analysis/analysisUrlState";
import type { AnalysisMoveMode, AnalysisRadius } from "./features/analysis/types";
import { useNearbyStores } from "./features/analysis/useNearbyStores";
import {
  CLUSTER_LABELS,
  FLOW_TIME_BUCKET_LABELS,
  categoryClass,
  circleFeature,
  demandFromFlow,
  formatMarketScore,
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
import {
  SelectedStorefrontLayer,
  type SelectedStorefront,
} from "./features/map/storefronts/SelectedStorefrontLayer";
import { hasStorefrontVariant } from "./features/map/storefronts/storefrontRegistry";
import { selectMapStores } from "./features/map/storefronts/storefrontSelection";
import { useCompactMap } from "./features/map/useCompactMap";
import type { ScoreDecisionBlocker } from "./services/marketAnalysis";
import "./styles/global.css";

const SCORE_BLOCKER_LABELS: Record<ScoreDecisionBlocker, string> = {
  fixture_present: "개발용 fixture가 포함됨",
  coverage_below_60: "사용 가능한 지표가 60% 미만",
  confidence_below_60: "근거 신뢰도가 60% 미만",
  required_metric_missing: "매출 또는 유동 수요 필수 지표가 누락됨",
  peer_sample_too_small: "비교 상권 표본이 30개 미만이거나 확인되지 않음",
  cluster_evidence_too_weak: "업종 집적효과 근거가 충분하지 않음",
};

const marketKeyById: Record<string, MarketKey> = {
  "3110562": "연남",
  "3120103": "홍대",
  "3120101": "합정",
};

const marketIdByKey: Record<MarketKey, string> = {
  연남: "3110562",
  홍대: "3120103",
  합정: "3120101",
};

const markets: Record<MarketKey, Market> = {
  연남: {
    name: "연남동 골목상권",
    address: "마포구 동교로 38길 일대",
    center: [126.922787722224, 37.5634957461626],
    score: 74,
    grade: "상위 31%",
    footfall: "41,820명",
    workPopulation: "18,540명",
    residentPopulation: "14,390명",
    opening: 7,
    closing: 3,
    demand: [22, 31, 78, 82, 69, 36],
    demandLabels: FLOW_TIME_BUCKET_LABELS,
    insight: "주말 오후 수요가 강하고, 카페 경쟁은 높은 편입니다.",
    stores: [
      {
        name: "아스테룸 433-10",
        category: "카페",
        distance: "155m",
        score: 74,
        longitude: 126.9269068,
        latitude: 37.567102,
      },
      {
        name: "레이어드",
        category: "카페",
        distance: "183m",
        score: 73,
        longitude: 126.9241878,
        latitude: 37.5649847,
      },
      {
        name: "Kitchen 유이",
        category: "음식점",
        distance: "20m",
        score: 69,
        longitude: 126.9254862,
        latitude: 37.5660537,
      },
      {
        name: "필스키친",
        category: "음식점",
        distance: "57m",
        score: 68,
        longitude: 126.9254994,
        latitude: 37.565614,
      },
      {
        name: "르브레드랩",
        category: "베이커리",
        distance: "287m",
        score: 67,
        longitude: 126.9254145,
        latitude: 37.563535,
      },
      {
        name: "지구제과",
        category: "베이커리",
        distance: "319m",
        score: 66,
        longitude: 126.9221696,
        latitude: 37.5655796,
      },
      {
        name: "지에스25",
        category: "편의점",
        distance: "57m",
        score: 62,
        longitude: 126.9253941,
        latitude: 37.5665511,
      },
      {
        name: "GS25 연희임광점",
        category: "편의점",
        distance: "126m",
        score: 61,
        longitude: 126.926522,
        latitude: 37.565172,
      },
    ],
    landmarks: [
      { name: "동진시장", longitude: 126.9248, latitude: 37.5668 },
      { name: "경의선숲길", longitude: 126.9274, latitude: 37.5654 },
      { name: "홍대입구역", longitude: 126.9241, latitude: 37.5571 },
    ],
  },
  홍대: {
    name: "홍대입구역 상권",
    address: "마포구 양화로 일대",
    center: [126.919317433833, 37.5527848842777],
    score: 68,
    grade: "상위 44%",
    footfall: "57,640명",
    workPopulation: "25,870명",
    residentPopulation: "9,210명",
    opening: 9,
    closing: 8,
    demand: [18, 35, 77, 89, 92, 43],
    demandLabels: FLOW_TIME_BUCKET_LABELS,
    insight: "저녁과 주말 수요가 두드러지며, 동일 업종 경쟁 변동을 함께 봐야 합니다.",
    stores: [
      {
        name: "Tiger Sugar",
        category: "카페",
        distance: "74m",
        score: 68,
        longitude: 126.9239687,
        latitude: 37.5555513,
      },
      {
        name: "Golden Crema",
        category: "카페",
        distance: "77m",
        score: 67,
        longitude: 126.9235955,
        latitude: 37.5555287,
      },
      {
        name: "공미학 마포홍대점",
        category: "음식점",
        distance: "25m",
        score: 65,
        longitude: 126.9238812,
        latitude: 37.5564136,
      },
      {
        name: "뚝닭 홍대",
        category: "음식점",
        distance: "25m",
        score: 64,
        longitude: 126.9239899,
        latitude: 37.5560287,
      },
      {
        name: "Bread & fruit",
        category: "베이커리",
        distance: "287m",
        score: 61,
        longitude: 126.9211938,
        latitude: 37.5577303,
      },
      {
        name: "바쿠단야끼",
        category: "베이커리",
        distance: "305m",
        score: 60,
        longitude: 126.926303,
        latitude: 37.5580791,
      },
      {
        name: "GS25",
        category: "편의점",
        distance: "63m",
        score: 60,
        longitude: 126.9232181,
        latitude: 37.5558759,
      },
      {
        name: "세븐일레븐",
        category: "편의점",
        distance: "65m",
        score: 59,
        longitude: 126.9243981,
        latitude: 37.5558606,
      },
    ],
    landmarks: [
      { name: "홍대입구역", longitude: 126.9241, latitude: 37.5571 },
      { name: "KT&G 상상마당 홍대", longitude: 126.9214, latitude: 37.5519 },
      { name: "홍익대학교", longitude: 126.9252, latitude: 37.5515 },
    ],
  },
  합정: {
    name: "합정역 상권",
    address: "마포구 양화로 45 일대",
    center: [126.91324192136, 37.5492309987762],
    score: 72,
    grade: "상위 34%",
    footfall: "49,880명",
    workPopulation: "22,310명",
    residentPopulation: "11,740명",
    opening: 8,
    closing: 5,
    demand: [21, 33, 76, 86, 88, 38],
    demandLabels: FLOW_TIME_BUCKET_LABELS,
    insight: "홍대와 연남의 방문 수요가 이어지고, 저녁 음식점 경쟁이 강한 연결형 상권입니다.",
    stores: [
      {
        name: "스타벅스",
        category: "카페",
        distance: "3m",
        score: 72,
        longitude: 126.9140273,
        latitude: 37.5504836,
      },
      {
        name: "카페 산티아고",
        category: "카페",
        distance: "158m",
        score: 71,
        longitude: 126.9152735,
        latitude: 37.5514951,
      },
      {
        name: "스파카 나폴리 합정",
        category: "음식점",
        distance: "228m",
        score: 69,
        longitude: 126.9156154,
        latitude: 37.5489059,
      },
      {
        name: "스케줄합정",
        category: "음식점",
        distance: "247m",
        score: 68,
        longitude: 126.91617,
        latitude: 37.5490965,
      },
      {
        name: "롤링핀",
        category: "베이커리",
        distance: "31m",
        score: 66,
        longitude: 126.913958,
        latitude: 37.5507747,
      },
      {
        name: "야미요밀 Vegan Bakery",
        category: "베이커리",
        distance: "161m",
        score: 65,
        longitude: 126.9153065,
        latitude: 37.5515126,
      },
      {
        name: "GS25 합정프리미엄점",
        category: "편의점",
        distance: "198m",
        score: 62,
        longitude: 126.915214,
        latitude: 37.549008,
      },
      {
        name: "CU 마포한강푸르지오점",
        category: "편의점",
        distance: "178m",
        score: 61,
        longitude: 126.912061,
        latitude: 37.55005,
      },
    ],
    landmarks: [
      { name: "합정역", longitude: 126.9139, latitude: 37.5495 },
      { name: "메세나폴리스", longitude: 126.9138, latitude: 37.5509 },
      { name: "양화진문화원", longitude: 126.9115, latitude: 37.5488 },
    ],
  },
};

export function App() {
  const compactMap = useCompactMap();
  const hasInitialUrlState = useMemo(() => window.location.search.length > 1, []);
  const initialUrlState = useMemo(
    () =>
      readAnalysisUrlState({
        marketKey: "연남",
        category: "카페",
        selectedCategoryName: "카페",
        selectedCategoryCode: null,
        radius: 300,
        layer: "density",
        scope: "radius",
        topic: "overview",
        boundaryVisible: true,
        storesVisible: true,
        period: "20251",
        center: markets.연남.center,
      }),
    [],
  );
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
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<MarketSearchResult | null>(null);
  const [urlSyncEnabled, setUrlSyncEnabled] = useState(hasInitialUrlState);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => !compactMap);
  const [inspectorOpen, setInspectorOpen] = useState(() => !compactMap);
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
  const filterOpenButtonRef = useRef<HTMLButtonElement>(null);
  const inspectorOpenButtonRef = useRef<HTMLButtonElement>(null);
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
    marketKey,
    categorySelection.coverage === "full" ? categorySelection.analysisCategory : null,
    period,
  );
  const nearby = useNearbyStores({
    center: committedCenter,
    radius,
    category: categorySelection.name,
  });

  useEffect(() => {
    if (!urlSyncEnabled) return;
    writeAnalysisUrlState({
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
    });
  }, [
    analysisScope,
    analysisTopic,
    boundaryVisible,
    category,
    categorySelection.code,
    categorySelection.name,
    committedCenter,
    layer,
    marketKey,
    period,
    radius,
    storesVisible,
    urlSyncEnabled,
  ]);

  useEffect(() => {
    if (defaultPeriod && !availablePeriods.includes(period)) setPeriod(defaultPeriod);
  }, [availablePeriods, defaultPeriod, period]);

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
  }, [committedCenter, marketKey, nearby.data]);

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
  }, [analysis, background, marketKey]);
  const displayTestFixtures = isTestEnvironment();
  const score =
    categorySelection.coverage !== "full"
      ? null
      : analysis
        ? Math.round(analysis.score.score)
        : displayTestFixtures
          ? formatMarketScore(market.score, category, radius)
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
  const selectedSearchStore = useMemo<MarketStore | null>(() => {
    if (
      selectedSearchResult?.result_type !== "store" ||
      marketKeyById[selectedSearchResult.market_id] !== marketKey
    ) {
      return null;
    }
    return {
      id: selectedSearchResult.id,
      name: selectedSearchResult.name,
      category: selectedSearchResult.category_name ?? "업종 미분류",
      categoryCode: selectedSearchResult.category_code,
      address: selectedSearchResult.address ?? undefined,
      distance: "검색 결과",
      score: market.score,
      longitude: selectedSearchResult.longitude,
      latitude: selectedSearchResult.latitude,
    };
  }, [market.score, marketKey, selectedSearchResult]);
  const selectedNearbyStore = useMemo(
    () => nearbyMarketStores.find((store) => store.name === selectedStore) ?? null,
    [nearbyMarketStores, selectedStore],
  );
  const selected =
    selectedSearchStore ??
    selectedNearbyStore ??
    (analysisScope === "market" && displayTestFixtures
      ? (market.stores.find((store) => store.name === selectedStore) ?? null)
      : null);
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
    const sourceStores =
      analysisScope === "radius"
        ? nearbyMarketStores
        : analysisSource === "demo" || displayTestFixtures
          ? market.stores
          : [];
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
    market.stores,
    analysisScope,
    categorySelection,
    nearbyMarketStores,
    selectedSearchStore,
    selectedStorefront3d,
    analysisSource,
    displayTestFixtures,
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
  const activeDemand = (analysis || displayTestFixtures ? market.demand[activeHour] : null) ?? 0;
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

  useEffect(() => {
    if (!selectedStore || selectedSearchStore) return;
    const selectableStores = analysisScope === "radius" ? nearbyMarketStores : market.stores;
    if (!selectableStores.some((store) => store.name === selectedStore)) setSelectedStore(null);
  }, [analysisScope, market.stores, nearbyMarketStores, selectedSearchStore, selectedStore]);

  useEffect(() => {
    if (!filtersOpen) filterOpenButtonRef.current?.focus();
  }, [filtersOpen]);

  useEffect(() => {
    if (!inspectorOpen) inspectorOpenButtonRef.current?.focus();
  }, [inspectorOpen]);

  function chooseMarket(nextMarket: MarketKey) {
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setMarketKey(nextMarket);
    setCommittedCenter(markets[nextMarket].center);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    setSelectedStore(null);
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
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setSelectedStore(null);
    setCategory(nextCategory);
    setCategorySelection(quickCategorySelection(nextCategory));
  }

  function chooseListedStore(storeName: string) {
    const store = visibleStores.find((candidate) => candidate.name === storeName);
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setSelectedStore(storeName);
    setInspectorOpen(true);
    if (store) applyCategorySelection(storeCategorySelection(store.category, store.categoryCode));
  }

  function chooseSearchResult(result: MarketSearchResult) {
    const nextMarket = marketKeyById[result.market_id];
    if (!nextMarket) return;
    setUrlSyncEnabled(true);
    setMarketKey(nextMarket);
    setSelectedStore(null);
    setSelectedSearchResult(result);
    setInspectorOpen(true);
    setCommittedCenter([result.longitude, result.latitude]);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
    if (result.result_type === "store") {
      setSelectedStore(result.name);
      setAnalysisScope("radius");
      applyCategorySelection(storeCategorySelection(result.category_name, result.category_code));
    }
  }

  function chooseMapMode(nextMode: MapMode) {
    setMapMode(nextMode);
  }

  function resetAnalysis() {
    setSelectedSearchResult(null);
    setSelectedStore(null);
    setUrlSyncEnabled(false);
    window.history.replaceState(window.history.state, "", window.location.pathname);
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
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setSelectedStore(null);
    setCommittedCenter(draftCenter);
    setDraftCenter(null);
    setAnalysisMoveMode("idle");
  }

  function chooseRadius(nextRadius: AnalysisRadius) {
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setSelectedStore(null);
    setRadius(nextRadius);
  }

  function chooseLayer(nextLayer: LayerMode) {
    setUrlSyncEnabled(true);
    setLayer(nextLayer);
  }

  function chooseScope(nextScope: AnalysisScope) {
    setUrlSyncEnabled(true);
    setSelectedSearchResult(null);
    setSelectedStore(null);
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
          <label className="header-control period-control">
            <span className="sr-only">분석 데이터 분기</span>
            <select
              aria-label="분석 데이터 분기"
              value={period}
              disabled={availablePeriods.length <= 1}
              title={
                availablePeriods.length <= 1
                  ? "현재 적재된 완결 분기는 한 개입니다."
                  : "분석할 완결 분기를 선택합니다."
              }
              onChange={(event) => {
                setPeriod(event.target.value);
                setUrlSyncEnabled(true);
              }}
            >
              {(availablePeriods.length > 0 ? availablePeriods : [period]).map((value) => (
                <option key={value} value={value}>
                  {`${value.slice(0, 4)}.${value.slice(4)}Q 기준`}
                </option>
              ))}
            </select>
          </label>
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
              setUrlSyncEnabled(true);
              setAnalysisTopic(nextTopic);
              if (nextTopic === "flow") setLayer("demand");
              if (nextTopic === "competition") setLayer("density");
            }}
            onBoundaryVisibleChange={(visible) => {
              setUrlSyncEnabled(true);
              setBoundaryVisible(visible);
            }}
            onStoresVisibleChange={(visible) => {
              setUrlSyncEnabled(true);
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
                  <SelectedStorefrontLayer
                    store={selectedStorefront3d}
                    onUnavailable={() => setStorefront3dUnavailable(true)}
                  />
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
              setSelectedSearchResult(null);
              setSelectedStore(null);
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
            <button className="modal-close" type="button" onClick={() => setEvidenceOpen(false)}>
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
            <button className="modal-close" type="button" onClick={() => setCompareOpen(false)}>
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
                const itemScore = actual
                  ? Math.round(actual.score.score)
                  : formatMarketScore(item.score, category, radius);
                const itemFlow = actual?.raw.total_flow;
                const netOpening = actual
                  ? actual.raw.opening_count - actual.raw.closure_count
                  : item.opening - item.closing;
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
                    <b>{itemScore}</b>
                    <small>
                      유동{" "}
                      {itemFlow == null
                        ? item.footfall
                        : `${Math.round(itemFlow).toLocaleString("ko-KR")}명/분기`}{" "}
                      · 순증 {netOpening > 0 ? "+" : ""}
                      {netOpening}
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

      {sceneOpen && <SceneWorkspace onClose={() => setSceneOpen(false)} />}
    </main>
  );
}

export default App;
