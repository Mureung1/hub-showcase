import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  Coffee,
  FileText,
  Layers3,
  LocateFixed,
  MapPinned,
  Minus,
  Plus,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";
import Map, { Layer, Marker, Source, type MapRef } from "react-map-gl/maplibre";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

import "./styles/global.css";

type Category = "카페" | "음식점" | "베이커리" | "편의점";
type MarketKey = "연남" | "홍대" | "신촌" | "성수";

type Market = {
  name: string;
  address: string;
  center: [number, number];
  score: number;
  grade: string;
  footfall: string;
  workPopulation: string;
  residentPopulation: string;
  opening: number;
  closing: number;
  demand: number[];
  insight: string;
  stores: Array<{
    name: string;
    category: Category;
    distance: string;
    score: number;
    longitude: number;
    latitude: number;
  }>;
  landmarks: Array<{ name: string; longitude: number; latitude: number }>;
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
  신촌: {
    name: "신촌역 상권",
    address: "서대문구 연세로 일대",
    center: [126.9369, 37.5552],
    score: 71,
    grade: "상위 37%",
    footfall: "45,210명",
    workPopulation: "28,760명",
    residentPopulation: "12,543명",
    opening: 5,
    closing: 3,
    demand: [25, 18, 10, 7, 9, 29, 58, 80, 84, 79, 70, 61, 40, 27],
    insight: "점심과 저녁 모두 수요가 있으며, 음식점 후보지의 회전율을 함께 확인해야 합니다.",
    stores: [
      {
        name: "아티제 신촌역점",
        category: "카페",
        distance: "54m",
        score: 71,
        longitude: 126.9371941,
        latitude: 37.5556231,
      },
      {
        name: "빽다방",
        category: "카페",
        distance: "80m",
        score: 70,
        longitude: 126.937103,
        latitude: 37.5559021,
      },
      {
        name: "버거옥 신촌직영점",
        category: "음식점",
        distance: "79m",
        score: 67,
        longitude: 126.9361666,
        latitude: 37.5556038,
      },
      {
        name: "무교동낙지 신촌점",
        category: "음식점",
        distance: "81m",
        score: 66,
        longitude: 126.9361938,
        latitude: 37.5556549,
      },
      {
        name: "더베이크 본사",
        category: "베이커리",
        distance: "54m",
        score: 64,
        longitude: 126.9371306,
        latitude: 37.555646,
      },
      {
        name: "로이드브랑제리",
        category: "베이커리",
        distance: "70m",
        score: 63,
        longitude: 126.9362743,
        latitude: 37.555585,
      },
      {
        name: "CU",
        category: "편의점",
        distance: "102m",
        score: 60,
        longitude: 126.936838,
        latitude: 37.5542886,
      },
      {
        name: "GS25",
        category: "편의점",
        distance: "137m",
        score: 59,
        longitude: 126.9363592,
        latitude: 37.556353,
      },
    ],
    landmarks: [
      { name: "신촌역", longitude: 126.9369, latitude: 37.5552 },
      { name: "연세대학교", longitude: 126.9385, latitude: 37.562 },
      { name: "연세로", longitude: 126.9361, latitude: 37.556 },
    ],
  },
  성수: {
    name: "성수동 카페거리",
    address: "성동구 연무장길 일대",
    center: [127.0554, 37.5447],
    score: 77,
    grade: "상위 24%",
    footfall: "38,950명",
    workPopulation: "31,420명",
    residentPopulation: "8,970명",
    opening: 10,
    closing: 4,
    demand: [16, 12, 10, 11, 20, 43, 72, 81, 79, 73, 76, 81, 63, 39],
    insight: "평일 업무 수요와 주말 체류 수요가 함께 나타나는 성장형 상권입니다.",
    stores: [
      {
        name: "스타벅스",
        category: "카페",
        distance: "25m",
        score: 77,
        longitude: 127.0554497,
        latitude: 37.5444766,
      },
      {
        name: "이디야커피",
        category: "카페",
        distance: "127m",
        score: 76,
        longitude: 127.0539654,
        latitude: 37.5446897,
      },
      {
        name: "스케줄 성수",
        category: "음식점",
        distance: "29m",
        score: 71,
        longitude: 127.0554581,
        latitude: 37.5444425,
      },
      {
        name: "일일향",
        category: "음식점",
        distance: "50m",
        score: 70,
        longitude: 127.0551317,
        latitude: 37.5443045,
      },
      {
        name: "뚜레쥬르",
        category: "베이커리",
        distance: "165m",
        score: 68,
        longitude: 127.057184,
        latitude: 37.5451012,
      },
      {
        name: "오로라 베이커리 카페",
        category: "베이커리",
        distance: "242m",
        score: 67,
        longitude: 127.0577327,
        latitude: 37.5435847,
      },
      {
        name: "이마트24 트랜드랩 성수점",
        category: "편의점",
        distance: "29m",
        score: 63,
        longitude: 127.055458,
        latitude: 37.544443,
      },
      {
        name: "세븐일레븐",
        category: "편의점",
        distance: "109m",
        score: 62,
        longitude: 127.0542191,
        latitude: 37.544953,
      },
    ],
    landmarks: [
      { name: "성수역", longitude: 127.0556, latitude: 37.5446 },
      { name: "대림창고", longitude: 127.0546, latitude: 37.5442 },
      { name: "어니언 성수", longitude: 127.0562, latitude: 37.5436 },
      { name: "서울숲", longitude: 127.0372, latitude: 37.5445 },
    ],
  },
};

const categories: Array<{ label: Category; icon: typeof Coffee; tone: string }> = [
  { label: "카페", icon: Coffee, tone: "green" },
  { label: "음식점", icon: Store, tone: "orange" },
  { label: "베이커리", icon: Building2, tone: "blue" },
  { label: "편의점", icon: MapPinned, tone: "gray" },
];

const hours = ["00", "03", "06", "09", "12", "15", "18", "21"];

function categoryClass(category: Category) {
  return category === "카페"
    ? "green"
    : category === "음식점"
      ? "orange"
      : category === "베이커리"
        ? "blue"
        : "gray";
}

function formatMarketScore(score: number, category: Category, radius: number) {
  const categoryShift =
    category === "음식점" ? -3 : category === "베이커리" ? 1 : category === "편의점" ? -2 : 0;
  const radiusShift = radius === 100 ? 2 : radius === 500 ? -2 : 0;
  return Math.max(0, Math.min(100, score + categoryShift + radiusShift));
}

function circleFeature([longitude, latitude]: [number, number], radiusMeters: number) {
  const points = 64;
  const coordinates = Array.from({ length: points + 1 }, (_, index) => {
    const angle = (index / points) * Math.PI * 2;
    const latitudeOffset = (radiusMeters / 111_320) * Math.sin(angle);
    const longitudeOffset =
      (radiusMeters / (111_320 * Math.cos((latitude * Math.PI) / 180))) * Math.cos(angle);
    return [longitude + longitudeOffset, latitude + latitudeOffset];
  });

  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "Polygon" as const, coordinates: [coordinates] },
  };
}

function isTestEnvironment() {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("jsdom");
}

export function App() {
  const [marketKey, setMarketKey] = useState<MarketKey>("성수");
  const [category, setCategory] = useState<Category>("카페");
  const [radius, setRadius] = useState(300);
  const [activeHour, setActiveHour] = useState(6);
  const [selectedStore, setSelectedStore] = useState<string>("스타벅스");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [layer, setLayer] = useState<"density" | "demand">("density");
  const [prefabMode, setPrefabMode] = useState(true);
  const [baseBuildingsVisible, setBaseBuildingsVisible] = useState(true);
  const mapRef = useRef<MapRef>(null);

  const market = markets[marketKey];
  const score = formatMarketScore(market.score, category, radius);
  const selected = market.stores.find((store) => store.name === selectedStore) ?? market.stores[0];
  const visibleStores = useMemo(
    () => [
      ...market.stores.filter((store) => store.category === category),
      ...market.stores.filter((store) => store.category !== category),
    ],
    [market, category],
  );
  const sameCategoryCount = radius === 100 ? 6 : radius === 300 ? 19 : 34;
  const densityLabel = layer === "density" ? "동일 업종 밀도" : "대표 시간대 수요";
  const circle = useMemo(() => circleFeature(market.center, radius), [market.center, radius]);
  const activeDemand = market.demand[activeHour];
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

  useEffect(() => {
    mapRef.current?.flyTo({
      center: market.center,
      zoom: 15.4,
      pitch: 38,
      bearing: -18,
      duration: 900,
      essential: true,
    });
  }, [market.center]);

  useEffect(() => {
    const categoryStore = market.stores.find((store) => store.category === category);
    if (categoryStore) {
      setSelectedStore(categoryStore.name);
    }
  }, [market, category]);

  function chooseMarket(nextMarket: MarketKey) {
    setMarketKey(nextMarket);
    setSelectedStore(markets[nextMarket].stores[0].name);
  }

  function setBaseBuildingVisibility(visible: boolean) {
    const map = mapRef.current?.getMap();
    if (!map?.isStyleLoaded()) return;

    if (map.getLayer("building-3d")) {
      map.setLayoutProperty("building-3d", "visibility", visible ? "visible" : "none");
    }
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
          <a className="header-control header-docs" href="/docs/wiki/doc-viewer.html?doc=Home.md">
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
        <span className="pulse-dot" /> 서울 상권분석 Open API 2025년 1분기 snapshot을 기준으로
        구성한 시연 화면입니다.{" "}
        <button type="button" onClick={() => setEvidenceOpen(true)}>
          데이터 범위 보기
        </button>
      </section>

      <section id="analysis" className="analysis-layout" aria-label="상권 분석 작업 공간">
        <aside className="filter-panel">
          <div className="panel-heading">
            <p>분석 범위</p>
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setCategory("카페");
                setRadius(300);
                setLayer("density");
                setPrefabMode(true);
                setBaseBuildingsVisible(true);
                setBaseBuildingVisibility(true);
              }}
            >
              초기화
            </button>
          </div>
          <label className="select-label">
            상권 선택
            <select
              value={marketKey}
              onChange={(event) => chooseMarket(event.target.value as MarketKey)}
            >
              {Object.keys(markets).map((name) => (
                <option key={name} value={name}>
                  {markets[name as MarketKey].name}
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
                  onClick={() => setRadius(value)}
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
                  onClick={() => setCategory(label)}
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
              onClick={() => setLayer("density")}
            >
              <Layers3 size={15} /> 경쟁 밀도
            </button>
            <button
              type="button"
              className={layer === "demand" ? "layer-option active" : "layer-option"}
              onClick={() => setLayer("demand")}
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
                key={store.name}
                type="button"
                className={`store-row ${selected.name === store.name ? "is-selected" : ""}`}
                onClick={() => setSelectedStore(store.name)}
              >
                <span className={`store-dot ${categoryClass(store.category)}`} />
                <span className="store-row-main">
                  <b>{store.name}</b>
                  <small>
                    {store.category} · {store.distance}
                  </small>
                </span>
                <strong>{store.score}</strong>
              </button>
            ))}
          </div>
        </aside>

        <section className="map-panel" aria-label="지도와 상권 분포">
          <div className="map-toolbar">
            <div className="map-search">
              <Search size={17} />
              <span>{market.address}</span>
            </div>
            <button
              type="button"
              className="glass-button"
              onClick={() => setLayer(layer === "density" ? "demand" : "density")}
            >
              <Layers3 size={16} /> {densityLabel}
            </button>
          </div>
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
                mapStyle="https://tiles.openfreemap.org/styles/liberty"
                attributionControl={false}
                dragPan
                scrollZoom
                touchZoomRotate
                onLoad={() => setBaseBuildingVisibility(baseBuildingsVisible)}
              >
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
                <Marker longitude={market.center[0]} latitude={market.center[1]} anchor="center">
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
                        aria-label={`${hours[Math.min(hours.length - 1, Math.floor(activeHour / 2))]}시대 유동 수요`}
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
                      onClick={() => setSelectedStore(store.name)}
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
                          <span className="prefab-roof" />
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
          {layer === "demand" && (
            <div className="flow-card">
              <span>시간대 유동 수요</span>
              <b>
                {hours[Math.min(hours.length - 1, Math.floor(activeHour / 2))]}시대 · {activeDemand}
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
              title="기본 지도 건물 표시"
              aria-pressed={baseBuildingsVisible}
              onClick={() =>
                setBaseBuildingsVisible((current) => {
                  const next = !current;
                  setBaseBuildingVisibility(next);
                  return next;
                })
              }
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

        <aside className="inspector-panel">
          <div className="inspector-title">
            <div>
              <p>{selected.name}</p>
              <span>
                {selected.category} · {market.address}
              </span>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={() => setSelectedStore(market.stores[0].name)}
            >
              <X size={18} />
            </button>
          </div>
          <section className="score-section">
            <div>
              <span>입지 점수</span>
              <strong>{score}</strong>
              <small>/ 100</small>
            </div>
            <b>{market.grade}</b>
            <button type="button" className="evidence-button" onClick={() => setEvidenceOpen(true)}>
              점수 산정 근거 <CircleHelp size={15} />
            </button>
          </section>
          <section className="metric-section">
            <div className="section-title">
              <span>경쟁 현황</span>
              <small>반경 {radius}m</small>
            </div>
            <div className="competition-chart">
              <div className="donut">
                <i />
                <b>{sameCategoryCount}</b>
                <small>동일 업종</small>
              </div>
              <div className="legend-list">
                <span>
                  <i className="green" /> 카페 <b>{category === "카페" ? sameCategoryCount : 12}</b>
                </span>
                <span>
                  <i className="orange" /> 음식점{" "}
                  <b>{category === "음식점" ? sameCategoryCount : 9}</b>
                </span>
                <span>
                  <i className="blue" /> 베이커리{" "}
                  <b>{category === "베이커리" ? sameCategoryCount : 4}</b>
                </span>
              </div>
            </div>
          </section>
          <section className="metric-section">
            <div className="section-title">
              <span>개·폐업 추이</span>
              <small>2025.1Q 기준</small>
            </div>
            <div className="trend-bars">
              {[5, 9, 4, 12, 7, 16, 10, 14, 20, 12, 8, 17].map((value, index) => (
                <span
                  key={index}
                  style={{ height: `${value * 2.2}px` }}
                  className={index === 4 || index === 8 ? "negative" : "positive"}
                />
              ))}
            </div>
            <div className="trend-summary">
              <span>
                <i className="positive" /> 개업 {market.opening}
              </span>
              <span>
                <i className="negative" /> 폐업 {market.closing}
              </span>
              <b>순증 {market.opening - market.closing}</b>
            </div>
          </section>
          <section className="metric-section">
            <div className="section-title">
              <span>시간대별 활동성</span>
              <small>{hours[Math.min(hours.length - 1, Math.floor(activeHour / 2))]}시대</small>
            </div>
            <div className="hour-chart">
              {market.demand.map((value, index) => (
                <button
                  key={index}
                  type="button"
                  title={`${index * 2}시 수요 ${value}`}
                  className={activeHour === index ? "active" : ""}
                  style={{ height: `${Math.max(10, value)}%` }}
                  onClick={() => setActiveHour(index)}
                >
                  <span />
                </button>
              ))}
            </div>
            <div className="hour-labels">
              <span>00시</span>
              <span>06시</span>
              <span>12시</span>
              <span>18시</span>
              <span>24시</span>
            </div>
          </section>
          <section className="population-section">
            <div>
              <span>주거 인구</span>
              <b>{market.residentPopulation}</b>
            </div>
            <div>
              <span>직장 인구</span>
              <b>{market.workPopulation}</b>
            </div>
            <div>
              <span>유동 인구</span>
              <b>{market.footfall}</b>
            </div>
          </section>
          <section className="insight-section">
            <span>분석 요약</span>
            <p>{market.insight}</p>
            <button type="button" onClick={() => window.print()}>
              <FileText size={15} /> 보고서로 보기
            </button>
          </section>
        </aside>
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
              <div>
                <span>점포 위치</span>
                <b>OpenStreetMap POI snapshot</b>
                <p>
                  2026.07.10에 조회한 카페·음식점·베이커리·편의점 이름과 좌표입니다. 전체 점포와
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
                <b>생활인구 집계</b>
                <p>대표 시간대 수요를 정규화한 시연 값입니다. 개인 이동 정보가 아닙니다.</p>
              </div>
              <div>
                <span>입지 점수</span>
                <b>규칙 기반 demo score</b>
                <p>수요, 동일 업종 경쟁, 개폐업 흐름을 합산한 설명용 점수입니다.</p>
              </div>
              <div>
                <span>분석 범위</span>
                <b>
                  {market.name} · {category}
                </b>
                <p>반경 {radius}m, 기준 기간 2025년 1분기를 화면 상태와 함께 기록합니다.</p>
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
                const itemScore = formatMarketScore(item.score, category, radius);
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
                      유동 {item.footfall} · 순증 +{item.opening - item.closing}
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
    </main>
  );
}

export default App;
