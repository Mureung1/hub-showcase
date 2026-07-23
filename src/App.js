import { useEffect, useRef, useState } from "react";
import "./App.css";
import { Badge, Button, SearchField } from "./components/ui";
import { supabase, toAppUser } from "./supabaseClient";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_MAP_JAVASCRIPT_KEY;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL
  || `${window.location.protocol}//${window.location.hostname}:4000`;
const PLACE_STORAGE_KEY = "jigeum-review:selected-place";
const MAP_SCREEN_STORAGE_KEY = "jigeum-review:map-screen";
const AUTH_RETURN_STORAGE_KEY = "jigeum-review:auth-return";
const HOME_GPS_STORAGE_KEY = "jigeum-review:home-gps";
const TEST_ANALYSIS_STORAGE_KEY = "jigeum-review:test-analyses";
const SENTIMENT_LABELS = {
  very_positive: "매우 좋음",
  positive: "좋음",
  neutral: "보통",
  negative: "아쉬움",
  very_negative: "매우 아쉬움",
};

function loadTestAnalyses(placeId) {
  try {
    const entries = JSON.parse(localStorage.getItem(TEST_ANALYSIS_STORAGE_KEY)) || [];
    return entries.filter((entry) => entry.placeId === placeId);
  } catch {
    return [];
  }
}

function saveTestAnalysis(entry) {
  let entries = [];
  try { entries = JSON.parse(localStorage.getItem(TEST_ANALYSIS_STORAGE_KEY)) || []; } catch { entries = []; }
  localStorage.setItem(TEST_ANALYSIS_STORAGE_KEY, JSON.stringify([...entries, entry]));
}

function loadMapScreenState() {
  try { return JSON.parse(sessionStorage.getItem(MAP_SCREEN_STORAGE_KEY)) || {}; } catch { return {}; }
}

function resetAndGoHome(event) {
  event?.preventDefault();
  sessionStorage.removeItem(PLACE_STORAGE_KEY);
  sessionStorage.removeItem(MAP_SCREEN_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
  sessionStorage.setItem(HOME_GPS_STORAGE_KEY, "true");
  window.location.assign("/");
}

async function apiRequest(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "요청을 처리하지 못했습니다.");
  return payload;
}

function loadKakaoMaps(appKey) {
  if (window.kakao?.maps) return Promise.resolve(window.kakao.maps);
  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector("script[data-kakao-map]");
    const handleReady = () => {
      if (!window.kakao?.maps) return reject(new Error("카카오맵 객체를 불러오지 못했습니다."));
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };
    if (existingScript) {
      existingScript.addEventListener("load", handleReady, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("카카오맵 SDK를 불러오지 못했습니다.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.dataset.kakaoMap = "true";
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&autoload=false`;
    script.onload = handleReady;
    script.onerror = () => reject(new Error("카카오맵 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}

function normalizePlace(item) {
  return { ...item, address: item.roadAddress || item.address, oldAddress: item.address, x: Number(item.x), y: Number(item.y) };
}

function distanceInMeters(first, second) {
  const toRadians = (degree) => (degree * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRadians(second.lat - first.lat);
  const lngDelta = toRadians(second.lng - first.lng);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(toRadians(first.lat)) * Math.cos(toRadians(second.lat)) * Math.sin(lngDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRoute() {
  if (window.location.pathname === "/login") return { name: "login" };
  const reviewMatch = window.location.pathname.match(/^\/places\/([^/]+)\/reviews\/new$/);
  if (reviewMatch) return { name: "review", placeId: decodeURIComponent(reviewMatch[1]) };
  const match = window.location.pathname.match(/^\/places\/([^/]+)$/);
  return match ? { name: "detail", placeId: decodeURIComponent(match[1]) } : { name: "map" };
}

function App() {
  const [route, setRoute] = useState(getRoute);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState("loading");
  const [selectedPlace, setSelectedPlace] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(PLACE_STORAGE_KEY)) || null; } catch { return null; }
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(toAppUser(data.session?.user));
      setAuthStatus("ready");
    });
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAppUser(session?.user));
      setAuthStatus("ready");
    });
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener("popstate", handlePopState);
    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  function navigate(path) {
    window.history.pushState({}, "", path);
    setRoute(getRoute());
  }

  function openPlace(place) {
    setSelectedPlace(place);
    sessionStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
    navigate(`/places/${encodeURIComponent(place.id)}`);
  }

  function openReview(place) {
    setSelectedPlace(place);
    sessionStorage.setItem(PLACE_STORAGE_KEY, JSON.stringify(place));
    const reviewPath = `/places/${encodeURIComponent(place.id)}/reviews/new`;
    if (user) return navigate(reviewPath);
    sessionStorage.setItem(AUTH_RETURN_STORAGE_KEY, reviewPath);
    navigate("/login");
  }

  function handleAuthenticated(nextUser) {
    setUser(nextUser);
    const fallbackPath = route.name === "review" ? window.location.pathname : "/";
    const returnPath = sessionStorage.getItem(AUTH_RETURN_STORAGE_KEY) || fallbackPath;
    sessionStorage.removeItem(AUTH_RETURN_STORAGE_KEY);
    navigate(returnPath);
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  }

  const shared = { user, authStatus, onLogin: () => navigate("/login"), onLogout: logout };
  if (route.name === "login") return <AuthPage user={user} onAuthenticated={handleAuthenticated} onBack={() => navigate("/")} />;
  if (route.name === "review") {
    const reviewPlace = selectedPlace?.id === route.placeId ? selectedPlace : null;
    if (authStatus === "loading") return <main className="route-empty"><strong>로그인 상태를 확인하고 있습니다.</strong></main>;
    if (!user) return <AuthPage user={user} onAuthenticated={handleAuthenticated} onBack={() => navigate(`/places/${encodeURIComponent(route.placeId)}`)} />;
    return <ReviewWritePage place={reviewPlace} onBack={() => navigate(`/places/${encodeURIComponent(route.placeId)}`)} />;
  }
  if (route.name === "detail") return <PlaceDetailPage {...shared} place={selectedPlace?.id === route.placeId ? selectedPlace : null} onBack={() => navigate("/")} onWriteReview={openReview} />;
  return <MapSearchPage {...shared} onOpenPlace={openPlace} />;
}

function AccountControl({ user, authStatus, onLogin, onLogout }) {
  if (authStatus === "loading") return <span className="account-loading">확인 중</span>;
  if (!user) return <button className="account-button" onClick={onLogin} type="button">로그인</button>;
  return (
    <div className="account-menu">
      <span className="account-avatar">{user.name.slice(0, 1)}</span>
      <span><strong>{user.name}</strong><small>{user.email}</small></span>
      <button onClick={onLogout} type="button">로그아웃</button>
    </div>
  );
}

function MapSearchPage({ onOpenPlace, ...accountProps }) {
  const restoredStateRef = useRef(loadMapScreenState());
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const resultsRef = useRef(null);
  const [mapStatus, setMapStatus] = useState(KAKAO_MAP_KEY ? "loading" : "missing-key");
  const [mapError, setMapError] = useState("");
  const [searchInput, setSearchInput] = useState(() => restoredStateRef.current.searchInput || "");
  const [places, setPlaces] = useState(() => restoredStateRef.current.places || []);
  const [placeStatus, setPlaceStatus] = useState(() => restoredStateRef.current.placeStatus || "idle");
  const [placeError, setPlaceError] = useState(() => restoredStateRef.current.placeError || "");
  const [selectedPlaceId, setSelectedPlaceId] = useState(() => restoredStateRef.current.selectedPlaceId || "");
  const [searchRadius, setSearchRadius] = useState(() => restoredStateRef.current.searchRadius || 5000);
  const [searchScope, setSearchScope] = useState(() => restoredStateRef.current.searchScope || "nearby");
  const [locationStatus, setLocationStatus] = useState("idle");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    if (!KAKAO_MAP_KEY || !mapElementRef.current) return;
    let mounted = true;
    loadKakaoMaps(KAKAO_MAP_KEY).then((maps) => {
      if (!mounted || !mapElementRef.current) return;
      const savedViewport = restoredStateRef.current.viewport;
      const center = savedViewport?.center || DEFAULT_CENTER;
      const map = new maps.Map(mapElementRef.current, { center: new maps.LatLng(center.lat, center.lng), level: savedViewport?.level || 5 });
      map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
      mapRef.current = map;
      setMapStatus("ready");
      if (sessionStorage.getItem(HOME_GPS_STORAGE_KEY) === "true") {
        sessionStorage.removeItem(HOME_GPS_STORAGE_KEY);
        if (navigator.geolocation) {
          setLocationStatus("loading");
          navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
              map.setCenter(new maps.LatLng(coords.latitude, coords.longitude));
              map.setLevel(4);
              setLocationStatus("ready");
            },
            () => {
              setLocationStatus("error");
              setPlaceError("현재 위치 권한을 허용하면 내 주변에서 검색할 수 있습니다.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        }
      }
    }).catch((error) => { if (mounted) { setMapStatus("error"); setMapError(error.message); } });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (resultsRef.current) resultsRef.current.scrollTop = restoredStateRef.current.resultsScrollTop || 0;
  }, []);

  useEffect(() => {
    const query = searchInput.trim();
    if (query.length < 2 || mapStatus !== "ready" || !mapRef.current) {
      setSuggestions([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const center = mapRef.current.getCenter();
        const params = new URLSearchParams({ query, size: "5", x: String(center.getLng()), y: String(center.getLat()), radius: "20000" });
        let payload = await apiRequest(`/api/kakao/local?${params.toString()}`);
        if (!(payload.items || []).length) payload = await apiRequest(`/api/kakao/local?${new URLSearchParams({ query, size: "5" }).toString()}`);
        if (!cancelled) setSuggestions((payload.items || []).map(normalizePlace));
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchInput, mapStatus]);

  function openPlaceAndPreserveMap(place) {
    const mapCenter = mapRef.current?.getCenter();
    sessionStorage.setItem(MAP_SCREEN_STORAGE_KEY, JSON.stringify({
      searchInput,
      places,
      placeStatus,
      placeError,
      selectedPlaceId: place.id,
      searchRadius,
      searchScope,
      resultsScrollTop: resultsRef.current?.scrollTop || 0,
      viewport: mapCenter ? {
        center: { lat: mapCenter.getLat(), lng: mapCenter.getLng() },
        level: mapRef.current.getLevel(),
      } : restoredStateRef.current.viewport,
    }));
    onOpenPlace(place);
  }

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !window.kakao?.maps) return;
    const maps = window.kakao.maps;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    if (!places.length) return;
    places.forEach((place) => {
      const position = new maps.LatLng(place.y, place.x);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = `map-marker ${place.id === selectedPlaceId ? "is-selected" : ""}`;
      marker.textContent = place.title;
      marker.addEventListener("click", () => setSelectedPlaceId(place.id));
      overlaysRef.current.push(new maps.CustomOverlay({ map: mapRef.current, position, content: marker, yAnchor: 1.25 }));
    });
  }, [places, selectedPlaceId, mapStatus]);

  async function searchPlaces(queryValue) {
    const query = queryValue.trim();
    if (!query) return;
    setSearchInput(query); setSuggestions([]); setPlaceStatus("loading"); setPlaceError(""); setSelectedPlaceId("");
    try {
      if (!mapRef.current) throw new Error("지도가 준비된 뒤 다시 검색해 주세요.");
      const center = mapRef.current.getCenter();
      const northEast = mapRef.current.getBounds().getNorthEast();
      const radius = Math.round(Math.min(20000, Math.max(500, distanceInMeters(
        { lat: center.getLat(), lng: center.getLng() },
        { lat: northEast.getLat(), lng: northEast.getLng() }
      ))));
      setSearchRadius(radius);
      const params = new URLSearchParams({ query, size: "15", x: String(center.getLng()), y: String(center.getLat()), radius: String(radius), sort: "distance" });
      let payload = await apiRequest(`/api/kakao/local?${params.toString()}`, { headers: {} });
      let nextPlaces = (payload.items || []).map(normalizePlace);
      if (!nextPlaces.length) {
        const fallbackParams = new URLSearchParams({ query, size: "15", sort: "accuracy" });
        payload = await apiRequest(`/api/kakao/local?${fallbackParams.toString()}`, { headers: {} });
        nextPlaces = (payload.items || []).map(normalizePlace);
        setSearchScope("all");
      } else {
        setSearchScope("nearby");
      }
      setPlaces(nextPlaces); setSelectedPlaceId(""); setPlaceStatus("ready");
    } catch (error) { setPlaces([]); setPlaceStatus("error"); setPlaceError(error.message); }
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    searchPlaces(searchInput);
  }

  function moveToCurrentLocation() {
    if (!navigator.geolocation) {
      setPlaceError("이 브라우저에서는 현재 위치를 사용할 수 없습니다.");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (mapRef.current && window.kakao?.maps) {
          mapRef.current.setCenter(new window.kakao.maps.LatLng(coords.latitude, coords.longitude));
          mapRef.current.setLevel(4);
        }
        setLocationStatus("ready");
      },
      () => {
        setPlaceError("현재 위치 권한을 허용하면 내 주변에서 검색할 수 있습니다.");
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }

  return (
    <main className="map-screen">
      <header className="top-nav"><a className="top-nav__brand brand-home-link" href="/" onClick={resetAndGoHome}>지금리뷰</a><span>영수증 인증 리뷰 지도</span><AccountControl {...accountProps} /></header>
      <aside className="place-sidebar">
        <div className="sidebar-search"><h1>어디를 찾으세요?</h1><p>현재 보고 있는 지도 주변을 먼저 검색하고, 결과가 없으면 전체 지역에서 찾습니다.</p><div className="search-autocomplete"><SearchField value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onClear={() => { setSearchInput(""); setSuggestions([]); }} onSubmit={handleSearchSubmit} />{suggestions.length > 0 && <div aria-label="장소 자동완성" className="search-suggestions">{suggestions.map((place) => <button key={place.id} onClick={() => searchPlaces(place.title)} type="button"><strong>{place.title}</strong><span>{place.category} · {place.address || "주소 정보 없음"}</span></button>)}</div>}</div><div className="search-scope"><span>{searchScope === "all" ? "주변 결과가 없어 전체 지역에서 찾았어요" : `지도 중심에서 약 ${(searchRadius / 1000).toFixed(searchRadius < 1000 ? 1 : 0)}km 이내`}</span><button onClick={moveToCurrentLocation} type="button">{locationStatus === "loading" ? "위치 확인 중..." : "◎ 내 위치"}</button></div></div>
        <div className={`place-results place-results--${placeStatus} ${places.length ? "has-results" : ""}`} aria-live="polite" ref={resultsRef}>
          {placeStatus === "ready" && places.length > 0 && <div className="place-results__header"><strong>검색 결과</strong><span>{places.length}곳</span></div>}
          {placeStatus === "idle" && <div className="empty-search"><strong>검색 결과가 여기에 표시됩니다</strong><span>식당이나 카페 이름을 입력해 주세요.</span></div>}
          {placeStatus === "loading" && <p className="sidebar-state">카카오맵에서 검색 중...</p>}
          {placeStatus === "error" && <p className="sidebar-state sidebar-state--error">{placeError}</p>}
          {placeStatus === "ready" && !places.length && <p className="sidebar-state">검색 결과가 없습니다.</p>}
          {places.map((place) => <button aria-label={`${place.title} 상세 보기`} className={`place-list-item ${selectedPlaceId === place.id ? "is-selected" : ""}`} key={place.id} onClick={() => openPlaceAndPreserveMap(place)} type="button"><span className="place-list-item__pin">⌖</span><span className="place-list-item__content"><strong>{place.title}</strong><span>{place.category}</span><small>{place.address || "주소 정보 없음"}</small></span><span aria-hidden="true">›</span></button>)}
        </div>
      </aside>
      <section className="map-canvas" aria-label="카카오맵 영역"><div className="kakao-map" ref={mapElementRef} aria-label="카카오맵" />{mapStatus !== "ready" && <section className="map-state-panel"><h2>{mapStatus === "missing-key" ? "지도 키가 필요합니다" : "지도를 불러오는 중입니다"}</h2><p>{mapError || "카카오맵 연결을 확인하고 있습니다."}</p></section>}</section>
    </main>
  );
}

function AuthPage({ user, onAuthenticated, onBack }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => { if (user) onBack(); }, [user, onBack]);
  async function submit(event) {
    event.preventDefault(); setStatus("loading"); setError("");
    try {
      if (mode === "login") {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (authError) throw authError;
        onAuthenticated(toAppUser(data.user));
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { display_name: form.name.trim() } },
        });
        if (authError) throw authError;
        if (!data.session) {
          setError("가입 확인 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
          setStatus("idle");
          return;
        }
        onAuthenticated(toAppUser(data.user));
      }
    } catch (submitError) { setError(submitError.message); setStatus("idle"); }
  }

  return (
    <main className="auth-page">
      <button className="auth-back" onClick={onBack} type="button">← 지도로 돌아가기</button>
      <section className="auth-card">
        <div className="auth-brand"><a className="brand-home-link" href="/" onClick={resetAndGoHome}>지금리뷰</a><h1>{mode === "login" ? "다시 만나서 반가워요" : "신뢰할 수 있는 리뷰를 시작해요"}</h1><p>방문이 인증된 리뷰로 더 좋은 장소를 함께 발견합니다.</p></div>
        <div className="auth-tabs"><button className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }} type="button">로그인</button><button className={mode === "signup" ? "is-active" : ""} onClick={() => { setMode("signup"); setError(""); }} type="button">회원가입</button></div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>이름</span><input required minLength="2" maxLength="30" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="표시할 이름" /></label>}
          <label><span>이메일</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label>
          <label><span>비밀번호</span><input required minLength="8" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8자 이상 입력" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <Button disabled={status === "loading"} type="submit">{status === "loading" ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}</Button>
        </form>
        <small className="auth-helper">계정과 로그인 세션은 Supabase Auth로 안전하게 관리됩니다.</small>
      </section>
    </main>
  );
}

function PlaceDetailPage({ place, user, authStatus, onLogin, onLogout, onBack, onWriteReview }) {
  if (!place) return <main className="route-empty"><strong>업체 정보를 찾을 수 없습니다.</strong><p>지도에서 업체를 다시 검색해 주세요.</p><Button onClick={onBack}>지도로 돌아가기</Button></main>;
  const reviewAction = () => onWriteReview(place);
  const testAnalyses = loadTestAnalyses(place.id);
  const sentimentBuckets = Object.keys(SENTIMENT_LABELS);
  const sentimentCounts = Object.fromEntries(sentimentBuckets.map((bucket) => [bucket, testAnalyses.filter((entry) => entry.bucket === bucket).length]));
  const testTotal = testAnalyses.length;
  return (
    <main className="detail-page">
      <aside className="detail-nav"><div><a className="detail-nav__brand brand-home-link" href="/" onClick={resetAndGoHome}>지금리뷰</a><span>Verified places</span></div><nav><button onClick={onBack} type="button">⌖ 지도 검색</button><button className="is-active" type="button">▤ 업체 리뷰</button></nav><Button onClick={reviewAction}>{user ? "영수증 리뷰 등록하기" : "로그인하고 리뷰 쓰기"}</Button></aside>
      <div className="detail-content"><header className="detail-header"><button onClick={onBack} type="button">← 지도</button><a className="detail-header__brand brand-home-link" href="/" onClick={resetAndGoHome}>지금리뷰</a><AccountControl user={user} authStatus={authStatus} onLogin={onLogin} onLogout={onLogout} /></header>
        <section className="place-summary"><div><Badge>{place.category || "음식점"}</Badge><h1>{place.title}</h1><p>{place.address || place.oldAddress || "주소 정보 없음"}</p></div>{place.link && <a href={place.link} rel="noreferrer" target="_blank">카카오맵에서 보기 ↗</a>}</section>
        <section className="place-facts"><div><span>전화</span><strong>{place.telephone || "등록된 전화번호 없음"}</strong></div><div><span>분류</span><strong>{place.fullCategory || place.category}</strong></div><div><span>방문 인증 리뷰</span><strong>0개</strong></div></section>
        <section className="review-insight"><div><span>리뷰 분석 {testTotal > 0 && "· 테스트 데이터"}</span><h2>{testTotal > 0 ? `텍스트 리뷰 ${testTotal}건 분석 결과` : "아직 분석할 인증 리뷰가 없습니다"}</h2></div><p>{testTotal > 0 ? "영수증 인증을 생략한 테스트 결과이며 실제 인증 리뷰 통계에는 포함되지 않습니다." : "영수증 OCR 인증을 통과한 리뷰가 등록되면 경험 분포와 주요 의견이 표시됩니다."}</p>{testTotal > 0 ? <div className="sentiment-chart">{sentimentBuckets.map((bucket) => { const percentage = Math.round((sentimentCounts[bucket] / testTotal) * 100); return <div className="sentiment-chart__item" key={bucket}><div className="sentiment-chart__track"><span style={{ height: `${Math.max(percentage, sentimentCounts[bucket] ? 8 : 0)}%` }} /></div><strong>{percentage}%</strong><small>{SENTIMENT_LABELS[bucket]}</small></div>; })}</div> : <div className="empty-bars" aria-hidden="true">{[1,2,3,4,5].map((item) => <span key={item} />)}</div>}</section>
        <section className="review-section"><div className="review-section__header"><div><span>{testTotal > 0 ? "테스트 리뷰" : "인증 리뷰"}</span><h2>방문자의 솔직한 경험</h2></div><Button onClick={reviewAction}>{user ? "리뷰 작성" : "로그인"}</Button></div>{testTotal > 0 ? <div className="test-review-list">{[...testAnalyses].reverse().map((review) => <article className="test-review-item" key={review.id}><div><Badge>테스트</Badge><strong>{SENTIMENT_LABELS[review.bucket]}</strong><span>신뢰도 {Math.round(review.confidence * 100)}%</span></div><p>{review.content}</p>{review.keywords?.length > 0 && <small>{review.keywords.map((keyword) => `#${keyword}`).join(" ")}</small>}</article>)}</div> : <div className="review-empty"><strong>첫 번째 인증 리뷰를 기다리고 있어요</strong><p>영수증 이미지로 방문을 인증한 리뷰만 집계됩니다.</p></div>}</section>
      </div>
    </main>
  );
}

function ReviewWritePage({ place, onBack }) {
  const draftKey = place ? `jigeum-review:review-draft:${place.id}` : "";
  const [content, setContent] = useState(() => {
    if (!draftKey) return "";
    try { return JSON.parse(sessionStorage.getItem(draftKey))?.content || ""; } catch { return ""; }
  });
  const [, setReceiptFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (!place) return <main className="route-empty"><strong>업체 정보를 찾을 수 없습니다.</strong><p>지도에서 업체를 다시 선택해 주세요.</p><Button onClick={onBack}>업체 상세로 돌아가기</Button></main>;

  function selectReceipt(event) {
    const file = event.target.files?.[0];
    setError(""); setSaved(false);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("영수증은 이미지 파일로 선택해 주세요."); event.target.value = ""; return; }
    if (file.size > 10 * 1024 * 1024) { setError("영수증 이미지는 10MB 이하만 사용할 수 있습니다."); event.target.value = ""; return; }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function saveDraft(event) {
    event.preventDefault(); setError(""); setSaved(null);
    if (content.trim().length < 10) return setError("리뷰 내용을 10자 이상 작성해 주세요.");
    setSubmitting(true);
    try {
      const payload = await apiRequest("/api/reviews/analyze", { method: "POST", body: JSON.stringify({ content: content.trim() }) });
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        placeId: place.id,
        content: content.trim(),
        ...payload.analysis,
        testOnly: true,
        createdAt: new Date().toISOString(),
      };
      saveTestAnalysis(entry);
      sessionStorage.removeItem(draftKey);
      setSaved(entry);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="review-write-page">
      <header className="review-write-header"><button onClick={onBack} type="button">← 업체 상세</button><strong>영수증 리뷰 작성</strong><span aria-hidden="true" /></header>
      <form className="review-write-card" onSubmit={saveDraft}>
        <div className="review-write-intro"><Badge>방문 인증</Badge><h1>{place.title}</h1><p>영수증으로 실제 방문을 확인한 뒤 리뷰가 등록됩니다.</p></div>
        <section className="receipt-step"><div><span className="step-number">1</span><div><h2>영수증 이미지</h2><p>상호명과 결제일이 잘 보이도록 촬영해 주세요.</p></div></div><label className={`receipt-upload ${previewUrl ? "has-preview" : ""}`}><input accept="image/*" onChange={selectReceipt} type="file" /><span>{previewUrl ? "다른 이미지 선택" : "영수증 이미지 선택"}</span>{previewUrl && <img alt="선택한 영수증 미리보기" src={previewUrl} />}</label></section>
        <section className="review-text-step"><div><span className="step-number">2</span><div><h2>방문 경험</h2><p>메뉴, 서비스, 분위기처럼 직접 경험한 내용을 알려주세요.</p></div></div><label><span className="sr-only">리뷰 내용</span><textarea maxLength="1000" onChange={(event) => { setContent(event.target.value); setSaved(false); }} placeholder="이 장소에서 어떤 경험을 하셨나요?" value={content} /></label><small>{content.length}/1000자 · 최소 10자</small></section>
        {error && <p className="review-form-message is-error" role="alert">{error}</p>}
        {saved && <p className="review-form-message is-saved" role="status">텍스트 분석 완료: <strong>{SENTIMENT_LABELS[saved.bucket]}</strong> ({Math.round(saved.confidence * 100)}%). 테스트 그래프에 반영했습니다.</p>}
        <div className="review-write-actions"><button onClick={onBack} type="button">{saved ? "그래프 보러 가기" : "취소"}</button><Button disabled={submitting} type="submit">{submitting ? "AI 분석 중..." : "텍스트 테스트 분석"}</Button></div>
      </form>
    </main>
  );
}

export default App;
