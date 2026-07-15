import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Badge, Button, Card, SearchField, Tabs } from "./components/ui";

const DEFAULT_CENTER = { lat: 37.517236, lng: 126.890989 };
const DEFAULT_QUERY = "문래동 맛집";
const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_MAP_JAVASCRIPT_KEY;
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const categoryQueries = [
  { label: "맛집", query: "문래동 맛집" },
  { label: "카페", query: "문래동 카페" },
  { label: "한식", query: "문래동 한식" },
  { label: "고기", query: "문래동 고기집" },
  { label: "강남", query: "강남역 맛집" },
];

const placeImages = [
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCRHZJlhiKyUc_grl0aC7uvfX4D57q6xq5qXAJxHf3eilr3qAY15yAENkJBDeSE_xr6lLbcnE_DD2uDEdN7Vs9ROMW3XDWGH2TVJN1xpmUrMT2PHWKahTi8-cKY0ga0GuYCryagLf2g5m9eJnroZUX1MzJf23NSb9yCIGS41BAAKFH6kbZES-AiRhsuLEsn9L9zx0oOA6iZEnkdSUM_5_WLOBRYnpvRE6puTjsCi9gCA8_hKLCDoEZ-54ipj7fTllP_jpvkLTnFtg",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuApZsV7RTIBpPZhPON1hvCV3OiLdvEdmD95c73TSKL_GL5Q6QJCB6496hTbZ66c6wLpMNbcXmQxlh_DE_uDdfq4_wjKUQAyXWk84h5-8UOQ-K2iHT2j-Y5jAMojidO3yVSm3nrobZsbkS9cIdhowoUC_nWfYQ6WkMjPB6QsgzWIiDmRmXD0jJozfUBU-jI-tJ3Ii5r0xX9UBw-JkUmB1uNvkvY0iWbd8zAzeOJwDmOkxuKuBCB6Ddm6JMyP_1JzLugf91iCqwchKw",
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAWrd7yMEBUTmJ3UF1EUvW3h_MlkuivyKykyeHicdJgp94zMjbHMo5__sjLq4SdcASms6WCfhlLRQZK2wqocoh0AJDn0g-9ByNk89spV5hJ9GAS3JnZ37nY4MzWy07yX33S07Rif53zj7cObMSf7MovYgkReAzfOu6QqTxNxL85wjScD_mdB6dip_1Zl64ufxpI2gKr8IJOwFze5IByh7b63_i-YkPeDXEpto_vhudq-jd2Vwtefm_hyf9epZr_ljjoG1XOrUDB2g",
];

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function loadKakaoMaps(appKey) {
  if (window.kakao?.maps) {
    return Promise.resolve(window.kakao.maps);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector("script[data-kakao-map]");

    const handleReady = () => {
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => resolve(window.kakao.maps));
      } else {
        reject(new Error("카카오맵 API가 로드됐지만 maps 객체가 없습니다."));
      }
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleReady);
      existingScript.addEventListener("error", () => {
        reject(new Error("카카오맵 API 스크립트 로드에 실패했습니다."));
      });
      return;
    }

    const script = document.createElement("script");
    script.dataset.kakaoMap = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey
    )}&autoload=false`;
    script.onload = handleReady;
    script.onerror = () => {
      reject(new Error("카카오맵 API 스크립트 로드에 실패했습니다."));
    };
    document.head.appendChild(script);
  });
}

function kakaoPointToLatLng(kakaoMaps, x, y) {
  const lng = Number(x);
  const lat = Number(y);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return new kakaoMaps.LatLng(lat, lng);
}

function normalizePlace(item, index) {
  const title = stripHtml(item.title);
  const categoryParts = stripHtml(item.fullCategory || item.category)
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);
  const category = item.category || categoryParts.at(-1) || "업체";

  return {
    id: item.id || `${item.x}-${item.y}-${title}-${index}`,
    title,
    category,
    fullCategory: item.fullCategory || categoryParts.join(" > ") || "분류 정보 없음",
    address: item.roadAddress || item.address || "주소 정보 없음",
    oldAddress: item.address || "",
    description: stripHtml(item.description),
    link: item.link || "",
    telephone: item.telephone || "",
    x: item.x,
    y: item.y,
  };
}

function createMarkerElement(place, selected) {
  const marker = document.createElement("button");
  const category = document.createElement("span");
  const title = document.createElement("strong");

  marker.type = "button";
  marker.className = `map-marker ${selected ? "is-selected" : ""}`;
  category.textContent = place.category;
  title.textContent = place.title;
  marker.append(category, title);
  return marker;
}

function App() {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapStatus, setMapStatus] = useState(KAKAO_MAP_KEY ? "loading" : "missing-key");
  const [mapError, setMapError] = useState("");
  const [places, setPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [searchInput, setSearchInput] = useState(DEFAULT_QUERY);
  const [placeStatus, setPlaceStatus] = useState("idle");
  const [placeError, setPlaceError] = useState("");
  const [reviewsByPlaceId, setReviewsByPlaceId] = useState({});
  const [reviewRating, setReviewRating] = useState("매우 만족");
  const [reviewText, setReviewText] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) || places[0],
    [places, selectedPlaceId]
  );

  const selectedReviews = selectedPlace
    ? reviewsByPlaceId[selectedPlace.id] || []
    : [];

  useEffect(() => {
    if (!KAKAO_MAP_KEY || !mapElementRef.current) {
      return;
    }

    let isMounted = true;

    loadKakaoMaps(KAKAO_MAP_KEY)
      .then((kakaoMaps) => {
        if (!isMounted || !mapElementRef.current) {
          return;
        }

        const map = new kakaoMaps.Map(mapElementRef.current, {
          center: new kakaoMaps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
          level: 4,
        });

        const zoomControl = new kakaoMaps.ZoomControl();
        map.addControl(zoomControl, kakaoMaps.ControlPosition.RIGHT);
        mapRef.current = map;
        setMapStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }
        setMapStatus("error");
        setMapError(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchPlaces() {
      setPlaceStatus("loading");
      setPlaceError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/kakao/local?query=${encodeURIComponent(
            query
          )}&size=5&sort=accuracy`,
          { signal: controller.signal }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.message || "카카오 로컬 검색에 실패했습니다.");
        }

        const nextPlaces = (payload.items || []).map(normalizePlace);
        setPlaces(nextPlaces);
        setSelectedPlaceId(nextPlaces[0]?.id || "");
        setPlaceStatus("ready");
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setPlaces([]);
        setSelectedPlaceId("");
        setPlaceStatus("error");
        setPlaceError(error.message);
      }
    }

    fetchPlaces();

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !window.kakao?.maps) {
      return;
    }

    const kakaoMaps = window.kakao.maps;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new kakaoMaps.LatLngBounds();
    let markerCount = 0;

    places.forEach((place) => {
      const position = kakaoPointToLatLng(kakaoMaps, place.x, place.y);

      if (!position) {
        return;
      }

      const markerElement = createMarkerElement(place, place.id === selectedPlaceId);
      markerElement.addEventListener("click", () => {
        setSelectedPlaceId(place.id);
        setIsDetailOpen(true);
        mapRef.current.panTo(position);
      });

      const marker = new kakaoMaps.CustomOverlay({
        map: mapRef.current,
        position,
        content: markerElement,
        xAnchor: 0.2,
        yAnchor: 1,
      });

      markersRef.current.push(marker);
      bounds.extend(position);
      markerCount += 1;
    });

    if (markerCount > 1) {
      mapRef.current.setBounds(bounds);
    } else if (markerCount === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setLevel(3);
    }
  }, [places, selectedPlaceId, mapStatus]);

  function handleSearchSubmit(event) {
    event.preventDefault();
    const trimmed = searchInput.trim();

    if (trimmed) {
      setQuery(trimmed);
    }
  }

  function handleCategoryClick(nextQuery) {
    setSearchInput(nextQuery);
    setQuery(nextQuery);
  }

  function selectPlace(place) {
    setSelectedPlaceId(place.id);
    setIsDetailOpen(true);
  }

  function handleReviewSubmit(event) {
    event.preventDefault();

    if (!selectedPlace || !reviewText.trim()) {
      return;
    }

    const nextReview = {
      id: `${selectedPlace.id}-${Date.now()}`,
      rating: reviewRating,
      text: reviewText.trim(),
      receiptName,
      createdAt: "방금 전",
    };

    setReviewsByPlaceId((current) => ({
      ...current,
      [selectedPlace.id]: [nextReview, ...(current[selectedPlace.id] || [])],
    }));
    setReviewText("");
    setReceiptName("");
  }

  return (
    <main className="map-screen" aria-label="카카오맵 기반 리뷰 서비스">
      <header className="top-nav">
        <div className="top-nav__brand">PureReview</div>
        <nav className="top-nav__links" aria-label="주요 메뉴">
          <button type="button" className="is-active">지도로 탐색</button>
          <button type="button">리뷰 작성</button>
          <button type="button">마이페이지</button>
        </nav>
        <button type="button" className="account-button" aria-label="내 정보">내</button>
      </header>

      <aside className="place-sidebar" aria-label="업체 검색 결과">
        <div className="sidebar-search">
          <SearchField
            onChange={(event) => setSearchInput(event.target.value)}
            onSubmit={handleSearchSubmit}
            value={searchInput}
          />
          <Tabs items={categoryQueries} onChange={handleCategoryClick} value={query} />
        </div>
        <div className="place-results" aria-live="polite">
          {placeStatus === "loading" && <p className="sidebar-state">업체를 불러오는 중...</p>}
          {placeStatus === "error" && <p className="sidebar-state sidebar-state--error">{placeError}</p>}
          {places.map((place, index) => (
            <button
              className={`place-list-item ${selectedPlace?.id === place.id ? "is-selected" : ""}`}
              key={place.id}
              onClick={() => selectPlace(place)}
              type="button"
            >
              <img alt="" className="place-list-item__image" src={placeImages[index % placeImages.length]} />
              <span className="place-list-item__content">
                <span className="place-list-item__headline">
                  <strong>{place.title}</strong>
                  <small>{index + 1}번째 결과</small>
                </span>
                <span className="place-list-item__category">{place.category} · {place.address}</span>
                <span className="place-list-item__tags">
                  <Badge>음식이 좋아요</Badge>
                  <Badge>인증 리뷰</Badge>
                </span>
                <span className="place-list-item__verified">인증 리뷰 {reviewsByPlaceId[place.id]?.length || 0}개</span>
              </span>
            </button>
          ))}
          {placeStatus === "ready" && places.length === 0 && <p className="sidebar-state">검색 결과가 없습니다.</p>}
        </div>
        <button className="register-place" type="button">식당 등록하기</button>
      </aside>

      <section className="map-canvas" aria-label="카카오맵 영역">
        <div className="kakao-map" ref={mapElementRef} aria-label="카카오맵" />

      {mapStatus !== "ready" && (
        <section className="map-state-panel" aria-live="polite">
          {mapStatus === "missing-key" ? (
            <>
              <h1>카카오맵 키가 필요해요</h1>
              <p>
                `.env.local`에 `REACT_APP_KAKAO_MAP_JAVASCRIPT_KEY`를 넣으면 실제
                카카오맵이 표시됩니다.
              </p>
            </>
          ) : (
            <>
              <h1>카카오맵 로딩 중</h1>
              <p>{mapError || "지도 스크립트를 불러오고 있습니다."}</p>
            </>
          )}
        </section>
      )}

        <div className="map-controls" aria-label="지도 제어">
          <button type="button" onClick={() => mapRef.current?.setLevel(mapRef.current.getLevel() - 1)}>+</button>
          <button type="button" onClick={() => mapRef.current?.setLevel(mapRef.current.getLevel() + 1)}>-</button>
        </div>

        {isDetailOpen && selectedPlace && (
        <aside className="place-sheet" aria-label="업체 정보와 리뷰">
          <button className="sheet-close" onClick={() => setIsDetailOpen(false)} type="button">닫기</button>
          <>
            <Card className="place-hero">
              <div>
                <p>{selectedPlace.fullCategory}</p>
                <h1>{selectedPlace.title}</h1>
                <div className="rating-line">
                  <strong>방문 데이터</strong>
                  <Badge>영수증 인증 리뷰 {selectedReviews.length}</Badge>
                </div>
              </div>
              {selectedPlace.link && (
                <a
                  className="kakao-link"
                  href={selectedPlace.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  카카오맵에서 보기
                </a>
              )}
            </Card>

            <Card className="sentiment-card" aria-label="리뷰 지표">
              <div className="section-title">
                <h2>리뷰 지표</h2>
                <span>인증 리뷰 기반</span>
              </div>
              <div className="sentiment-bars">
                {[
                  ["맛", 88],
                  ["서비스", 76],
                  ["가성비", 82],
                  ["분위기", 69],
                  ["청결", 91],
                ].map(([label, value]) => (
                  <div className="sentiment-item" key={label}>
                    <div className="bar-track" aria-hidden="true">
                      <span style={{ height: `${value}%` }} />
                    </div>
                    <strong>{label}</strong>
                    <small>{value}</small>
                  </div>
                ))}
              </div>
            </Card>

            <div className="quick-actions" aria-label="업체 빠른 작업">
              <Button type="button" variant="secondary">길찾기</Button>
              <Button type="button" variant="secondary">전화</Button>
              <Button type="button" variant="secondary">저장</Button>
              <Button type="button" variant="secondary">공유</Button>
            </div>

            <section className="info-list" aria-label="업체 기본 정보">
              <div>
                <span>도로명</span>
                <strong>{selectedPlace.address}</strong>
              </div>
              {selectedPlace.oldAddress && (
                <div>
                  <span>지번</span>
                  <strong>{selectedPlace.oldAddress}</strong>
                </div>
              )}
              <div>
                <span>분류</span>
                <strong>{selectedPlace.fullCategory}</strong>
              </div>
              <div>
                <span>전화</span>
                <strong>{selectedPlace.telephone || "카카오 로컬 검색 미제공"}</strong>
              </div>
            </section>

            <Card className="write-card" aria-label="리뷰 작성">
              <div>
                <p>리뷰 작성</p>
                <strong>영수증을 첨부하고 방문 리뷰를 남겨보세요</strong>
              </div>

              <form onSubmit={handleReviewSubmit}>
                <label>
                  <span>영수증</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) =>
                      setReceiptName(event.target.files?.[0]?.name || "")
                    }
                  />
                </label>
                <label>
                  <span>만족도</span>
                  <select
                    value={reviewRating}
                    onChange={(event) => setReviewRating(event.target.value)}
                  >
                    <option value="매우 만족">매우 만족</option>
                    <option value="만족">만족</option>
                    <option value="보통">보통</option>
                    <option value="아쉬움">아쉬움</option>
                  </select>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(event) => setReviewText(event.target.value)}
                  placeholder="음식, 서비스, 분위기를 솔직하게 남겨주세요."
                />
                <Button type="submit" disabled={!reviewText.trim()}>
                  리뷰 등록
                </Button>
              </form>
            </Card>

            <Card className="reviews" aria-label="인증 리뷰">
              <div className="section-title">
                <h2>인증 리뷰</h2>
                <span>DB 연동 전까지는 브라우저에 임시 저장됩니다</span>
              </div>

              <div className="review-list">
                {selectedReviews.length > 0 ? (
                  selectedReviews.map((review) => (
                    <article className="review-card" key={review.id}>
                      <div className="review-meta">
                        <Badge tone={review.receiptName ? "verified" : "pending"}>
                          {review.receiptName ? "영수증 인증" : "인증 대기"}
                        </Badge>
                        <strong>{review.rating}</strong>
                        <span>{review.createdAt}</span>
                      </div>
                      <p>{review.text}</p>
                      {review.receiptName && <footer>{review.receiptName}</footer>}
                    </article>
                  ))
                ) : (
                  <p className="empty-state">
                    아직 이 업체에 등록된 리뷰가 없습니다. 첫 리뷰를 남겨보세요.
                  </p>
                )}
              </div>
            </Card>
          </>
        </aside>
        )}
      </section>

      <nav className="mobile-nav" aria-label="모바일 메뉴">
        <button className="is-active" type="button">탐색</button>
        <button type="button">저장</button>
        <button type="button">리뷰 작성</button>
        <button type="button">내정보</button>
      </nav>
    </main>
  );
}

export default App;
