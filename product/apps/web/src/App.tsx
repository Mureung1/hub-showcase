import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Layers3,
  LocateFixed,
  MapPinned,
  Minus,
  Plus,
  ScanLine,
  X,
} from "lucide-react";
import type { StyleSpecification } from "maplibre-gl";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import { SceneWorkspace } from "./components/SceneWorkspace";
import {
  CLUSTER_LABELS,
  HOURS,
  categoryClass,
  circleFeature,
  demandFromFlow,
  formatMarketScore,
  isTestEnvironment,
} from "./features/market/model";
import { analysisCategoryFor } from "./features/market/categoryMapping";
import { MarketFilters } from "./features/market/MarketFilters";
import { MarketInspector } from "./features/market/MarketInspector";
import type {
  Category,
  LayerMode,
  MapMode,
  Market,
  MarketKey,
  MarketStore,
} from "./features/market/types";
import { useMarketAnalysis } from "./features/market/useMarketAnalysis";
import { MarketSearch } from "./features/search/MarketSearch";
import type { MarketSearchResult } from "./features/search/searchApi";
import "./styles/global.css";

const localTwinMapStyle: StyleSpecification = {
  version: 8,
  name: "LocalTwin map",
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "localtwin-background",
      type: "background",
      paint: { "background-color": "#e9eee7" },
    },
  ],
  light: {
    anchor: "map",
    color: "#fff8e7",
    intensity: 0.58,
    position: [1.15, 210, 36],
  },
};

const marketMapSlug: Record<MarketKey, string> = {
  연남: "yeonnam",
  홍대: "hongdae",
  합정: "hapjeong",
};

const marketKeyById: Record<string, MarketKey> = {
  "3110562": "연남",
  "3120103": "홍대",
  "3120101": "합정",
};

const markets: Record<MarketKey, Market> = {
  연남: {
    name: "연남동 골목상권",
    address: "마포구 동교로 38길 일대",
    center: [126.9257, 37.5661],
    score: 74,
    grade: "상위 31%",
    footfall: "41,820명",
    workPopulation: "18,540명",
    residentPopulation: "14,390명",
    opening: 7,
    closing: 3,
    demand: [22, 16, 11, 9, 12, 31, 62, 78, 82, 75, 69, 57, 36, 22],
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
    center: [126.9238, 37.5562],
    score: 68,
    grade: "상위 44%",
    footfall: "57,640명",
    workPopulation: "25,870명",
    residentPopulation: "9,210명",
    opening: 9,
    closing: 8,
    demand: [18, 10, 8, 8, 15, 35, 64, 77, 83, 89, 92, 87, 66, 43],
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
    center: [126.914, 37.5505],
    score: 72,
    grade: "상위 34%",
    footfall: "49,880명",
    workPopulation: "22,310명",
    residentPopulation: "11,740명",
    opening: 8,
    closing: 5,
    demand: [21, 14, 9, 8, 13, 33, 60, 76, 82, 86, 88, 83, 61, 38],
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
  const [marketKey, setMarketKey] = useState<MarketKey>("연남");
  const [category, setCategory] = useState<Category>("카페");
  const [radius, setRadius] = useState(300);
  const [activeHour, setActiveHour] = useState(6);
  const [selectedStore, setSelectedStore] = useState<string>("아스테룸 433-10");
  const [selectedSearchResult, setSelectedSearchResult] = useState<MarketSearchResult | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sceneOpen, setSceneOpen] = useState(false);
  const [layer, setLayer] = useState<LayerMode>("density");
  const [mapMode, setMapMode] = useState<MapMode>("localtwin");
  const [prefabMode, setPrefabMode] = useState(true);
  const [baseBuildingsVisible, setBaseBuildingsVisible] = useState(true);
  const mapRef = useRef<MapRef>(null);
  const { analysis, analysisSource, analysisState, comparison } = useMarketAnalysis(
    marketKey,
    category,
  );

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
      workPopulation: "미수집",
      residentPopulation: "미수집",
      opening: analysis.raw.opening_count,
      closing: analysis.raw.closure_count,
      demand: demandFromFlow(analysis.raw.flow_by_time),
      insight: reason || analysis.score.cluster.explanation,
    };
  }, [analysis, marketKey]);
  const score = analysis
    ? Math.round(analysis.score.score)
    : formatMarketScore(market.score, category, radius);
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
      address: selectedSearchResult.address ?? undefined,
      distance: "검색 결과",
      score: market.score,
      longitude: selectedSearchResult.longitude,
      latitude: selectedSearchResult.latitude,
    };
  }, [market.score, marketKey, selectedSearchResult]);
  const selected =
    selectedSearchStore ??
    market.stores.find((store) => store.name === selectedStore) ??
    market.stores[0];
  const visibleStores = useMemo(() => {
    const stores = selectedSearchStore
      ? [
          selectedSearchStore,
          ...market.stores.filter(
            (store) =>
              (store.id ?? store.name) !== selectedSearchStore.id &&
              store.name !== selectedSearchStore.name,
          ),
        ]
      : market.stores;
    return [
      ...stores.filter((store) => store.category === category),
      ...stores.filter((store) => store.category !== category),
    ];
  }, [market.stores, category, selectedSearchStore]);
  const sameCategoryCount =
    analysis?.raw.category_store_count ?? (radius === 100 ? 6 : radius === 300 ? 19 : 34);
  const densityLabel = layer === "density" ? "동일 업종 밀도" : "대표 시간대 수요";
  const analysisCenter = useMemo<[number, number]>(
    () =>
      selectedSearchResult && marketKeyById[selectedSearchResult.market_id] === marketKey
        ? [selectedSearchResult.longitude, selectedSearchResult.latitude]
        : market.center,
    [market.center, marketKey, selectedSearchResult],
  );
  const circle = useMemo(() => circleFeature(analysisCenter, radius), [analysisCenter, radius]);
  const activeDemand = market.demand[activeHour];
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
      center: analysisCenter,
      zoom: 15.4,
      pitch: mapMode === "localtwin" ? 52 : 38,
      bearing: mapMode === "localtwin" ? -24 : -18,
      duration: 900,
      essential: true,
    });
  }, [analysisCenter, mapMode]);

  useEffect(() => {
    if (selectedSearchStore) return;
    const categoryStore = market.stores.find((store) => store.category === category);
    if (categoryStore) {
      setSelectedStore(categoryStore.name);
    }
  }, [market, category, selectedSearchStore]);

  function chooseMarket(nextMarket: MarketKey) {
    setSelectedSearchResult(null);
    setMarketKey(nextMarket);
    setSelectedStore(markets[nextMarket].stores[0].name);
  }

  function chooseListedStore(storeName: string) {
    setSelectedSearchResult(null);
    setSelectedStore(storeName);
  }

  function chooseSearchResult(result: MarketSearchResult) {
    const nextMarket = marketKeyById[result.market_id];
    if (!nextMarket) return;
    setMarketKey(nextMarket);
    setSelectedSearchResult(result);
    if (result.result_type === "store") {
      setSelectedStore(result.name);
      const nextCategory = analysisCategoryFor(result.category_name);
      if (nextCategory) setCategory(nextCategory);
    }
  }

  function chooseMapMode(nextMode: MapMode) {
    setMapMode(nextMode);
  }

  function resetAnalysis() {
    setSelectedSearchResult(null);
    setCategory("카페");
    setRadius(300);
    setLayer("density");
    setMapMode("localtwin");
    setPrefabMode(true);
    setBaseBuildingsVisible(true);
    mapRef.current?.easeTo({
      center: market.center,
      zoom: 15.4,
      pitch: 52,
      bearing: -24,
      duration: 650,
      essential: true,
    });
  }

  return (
    <main className="app-shell">
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
            입지 비교
          </button>
          <button className="nav-item" type="button" onClick={() => setCategory("음식점")}>
            업종 분석
          </button>
          <button className="nav-item" type="button" onClick={() => setLayer("demand")}>
            수요 분석
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
          <button className="header-control" type="button" onClick={() => setCompareOpen(true)}>
            <MapPinned size={16} /> {marketKey}
            <ChevronDown size={14} />
          </button>
          <button className="header-control" type="button">
            <CalendarDays size={16} /> 2025.1Q
            <ChevronDown size={14} />
          </button>
          <button className="icon-button" type="button" title="도움말">
            <CircleHelp size={19} />
          </button>
          <button className="avatar" type="button" title="내 분석">
            H
          </button>
        </div>
      </header>

      <section className="demo-note" aria-label="데모 데이터 안내">
        <span className="pulse-dot" />
        {analysisState === "loading"
          ? "서울 상권분석 공식 데이터를 불러오는 중입니다."
          : analysisState === "error"
            ? "분석 데이터를 열지 못해 화면 예시 값을 표시합니다."
            : `서울 상권분석 2025년 1분기 ${analysisSource === "api" ? "API" : "검증 snapshot"} 결과입니다.`}{" "}
        <button type="button" onClick={() => setEvidenceOpen(true)}>
          데이터 범위 보기
        </button>
      </section>

      <section id="analysis" className="analysis-layout" aria-label="상권 분석 작업 공간">
        <MarketFilters
          marketKey={marketKey}
          markets={markets}
          category={category}
          radius={radius}
          layer={layer}
          sameCategoryCount={sameCategoryCount}
          usesAnalysis={analysis !== null}
          visibleStores={visibleStores}
          selectedStoreName={selected.name}
          onReset={resetAnalysis}
          onMarketChange={chooseMarket}
          onRadiusChange={setRadius}
          onCategoryChange={setCategory}
          onLayerChange={setLayer}
          onStoreChange={chooseListedStore}
        />

        <section className="map-panel" aria-label="지도와 상권 분포">
          <div className="map-toolbar">
            <MarketSearch onSelect={chooseSearchResult} />
            <div className="map-toolbar-actions">
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
                mapStyle={
                  mapMode === "localtwin"
                    ? localTwinMapStyle
                    : "https://tiles.openfreemap.org/styles/liberty"
                }
                attributionControl={false}
                dragPan
                scrollZoom
                touchZoomRotate
              >
                {mapMode === "localtwin" ? (
                  <Source
                    id="localtwin-map"
                    type="geojson"
                    data={`/map/${marketMapSlug[marketKey]}.geojson`}
                    attribution="© OpenStreetMap contributors"
                  >
                    <Layer
                      id="localtwin-landcover"
                      type="fill"
                      filter={["==", ["get", "layer"], "landcover"]}
                      paint={{
                        "fill-color": [
                          "match",
                          ["get", "class"],
                          "park",
                          "#aad39f",
                          "garden",
                          "#bddcae",
                          "forest",
                          "#91c49b",
                          "#c7dfb5",
                        ],
                        "fill-opacity": 0.94,
                      }}
                    />
                    <Layer
                      id="localtwin-water-fill"
                      type="fill"
                      filter={[
                        "all",
                        ["==", ["get", "layer"], "water"],
                        ["==", ["geometry-type"], "Polygon"],
                      ]}
                      paint={{ "fill-color": "#9bd2e7", "fill-opacity": 0.9 }}
                    />
                    <Layer
                      id="localtwin-water-line"
                      type="line"
                      filter={[
                        "all",
                        ["==", ["get", "layer"], "water"],
                        ["==", ["geometry-type"], "LineString"],
                      ]}
                      paint={{ "line-color": "#77c4df", "line-width": 3 }}
                    />
                    <Layer
                      id="localtwin-road-casing"
                      type="line"
                      filter={["==", ["get", "layer"], "road"]}
                      layout={{ "line-cap": "round", "line-join": "round" }}
                      paint={{
                        "line-color": "#c9c7bb",
                        "line-width": [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          13,
                          ["match", ["get", "class"], ["primary", "secondary"], 5, 2],
                          17,
                          ["match", ["get", "class"], ["primary", "secondary"], 22, 10],
                        ],
                      }}
                    />
                    <Layer
                      id="localtwin-road"
                      type="line"
                      filter={["==", ["get", "layer"], "road"]}
                      layout={{ "line-cap": "round", "line-join": "round" }}
                      paint={{
                        "line-color": [
                          "match",
                          ["get", "class"],
                          ["primary", "secondary"],
                          "#f5cf82",
                          ["pedestrian", "footway", "path"],
                          "#eadfc8",
                          "#fffdf7",
                        ],
                        "line-width": [
                          "interpolate",
                          ["linear"],
                          ["zoom"],
                          13,
                          ["match", ["get", "class"], ["primary", "secondary"], 4, 1],
                          17,
                          ["match", ["get", "class"], ["primary", "secondary"], 19, 8],
                        ],
                      }}
                    />
                    <Layer
                      id="localtwin-building-3d"
                      type="fill-extrusion"
                      minzoom={13}
                      filter={["==", ["get", "layer"], "building"]}
                      layout={{ visibility: baseBuildingsVisible ? "visible" : "none" }}
                      paint={{
                        "fill-extrusion-base": ["get", "min_height"],
                        "fill-extrusion-height": ["get", "height"],
                        "fill-extrusion-color": [
                          "match",
                          ["get", "palette"],
                          0,
                          "#f1d6a5",
                          1,
                          "#b9d8c1",
                          2,
                          "#a9cfdf",
                          3,
                          "#e9b9ad",
                          "#d5c3e2",
                        ],
                        "fill-extrusion-opacity": 0.96,
                        "fill-extrusion-vertical-gradient": true,
                      }}
                    />
                    <Layer
                      id="localtwin-road-label"
                      type="symbol"
                      minzoom={14.7}
                      filter={[
                        "all",
                        ["==", ["get", "layer"], "road"],
                        ["!=", ["get", "name"], ""],
                      ]}
                      layout={{
                        "symbol-placement": "line",
                        "text-field": ["get", "name"],
                        "text-font": ["Noto Sans Regular"],
                        "text-size": 10,
                        "text-max-angle": 35,
                        "text-padding": 12,
                      }}
                      paint={{
                        "text-color": "#657168",
                        "text-halo-color": "#fffdf7",
                        "text-halo-width": 1.4,
                      }}
                    />
                    <Layer
                      id="localtwin-poi-label"
                      type="symbol"
                      minzoom={16.1}
                      filter={["all", ["==", ["get", "layer"], "poi"], ["!=", ["get", "name"], ""]]}
                      layout={{
                        "text-field": ["get", "name"],
                        "text-font": ["Noto Sans Regular"],
                        "text-size": 10,
                        "text-offset": [0, 1.2],
                        "text-anchor": "top",
                        "text-allow-overlap": false,
                      }}
                      paint={{
                        "text-color": "#34443a",
                        "text-halo-color": "#f5f8f3",
                        "text-halo-width": 1.2,
                      }}
                    />
                  </Source>
                ) : (
                  <Layer
                    id="market-building-3d"
                    type="fill-extrusion"
                    source="openmaptiles"
                    source-layer="building"
                    minzoom={14}
                    beforeId="boundary_3"
                    layout={{ visibility: baseBuildingsVisible ? "visible" : "none" }}
                    paint={{
                      "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                      "fill-extrusion-color": "hsl(35, 8%, 85%)",
                      "fill-extrusion-height": ["coalesce", ["get", "render_height"], 8],
                      "fill-extrusion-opacity": 0.8,
                      "fill-extrusion-vertical-gradient": true,
                    }}
                  />
                )}
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
                <Marker longitude={analysisCenter[0]} latitude={analysisCenter[1]} anchor="center">
                  <span className="analysis-center">
                    <span>{radius}m</span>
                  </span>
                </Marker>
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
                        aria-label={`${HOURS[Math.min(HOURS.length - 1, Math.floor(activeHour / 2))]}시대 유동 수요`}
                      />
                    </Marker>
                  ))}
                {market.stores.map((store) => (
                  <Marker
                    key={store.name}
                    longitude={store.longitude}
                    latitude={store.latitude}
                    anchor="bottom"
                  >
                    <button
                      type="button"
                      aria-label={`${store.name} 후보 보기`}
                      className={
                        prefabMode
                          ? `prefab-building ${categoryClass(store.category)} ${selected.name === store.name ? "is-selected" : ""}`
                          : `map-marker ${categoryClass(store.category)} ${selected.name === store.name ? "is-selected" : ""}`
                      }
                      onClick={() => chooseListedStore(store.name)}
                    >
                      {prefabMode ? (
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
                ))}
                <Marker
                  longitude={selected.longitude}
                  latitude={selected.latitude}
                  anchor="bottom-left"
                  offset={[18, -23]}
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
              </Map>
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
            {mapMode === "localtwin" ? "LocalTwin map data" : "OpenFreeMap"} · © OpenStreetMap
            contributors
          </div>
          {layer === "demand" && (
            <div className="flow-card">
              <span>시간대 유동 수요</span>
              <b>
                {HOURS[Math.min(HOURS.length - 1, Math.floor(activeHour / 2))]}시대 · {activeDemand}
                /100
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
          <button type="button" className="compare-cta" onClick={() => setCompareOpen(true)}>
            <BarChart3 size={17} /> 다른 상권과 비교
          </button>
        </section>

        <MarketInspector
          market={market}
          selected={selected}
          score={score}
          category={category}
          radius={radius}
          activeHour={activeHour}
          sameCategoryCount={sameCategoryCount}
          analysis={analysis}
          onCloseSelection={() => chooseListedStore(market.stores[0].name)}
          onEvidenceOpen={() => setEvidenceOpen(true)}
          onActiveHourChange={setActiveHour}
        />
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
            <p className="modal-eyebrow">EVIDENCE · 2025.1Q</p>
            <h2>이 화면의 숫자는 이렇게 읽습니다.</h2>
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
                        : "근거가 충분하지 않아 점수보다 원자료와 누락 지표를 먼저 확인해야 합니다."}
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
                <span>점포 위치</span>
                <b>OpenStreetMap POI snapshot</b>
                <p>
                  2026.07.11에 조회한 카페·음식점·베이커리·편의점 이름과 좌표입니다. 전체 점포와
                  영업 상태를 완전하게 보장하지는 않습니다.
                </p>
              </div>
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
                <b>LocalTwin score v{analysis?.score.formula_version ?? "1.0.0"}</b>
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
                  지도 탐색 반경은 {radius}m이며, 우측 집계는 서울시 상권 경계와 2025년 1분기를
                  기준으로 합니다.
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
