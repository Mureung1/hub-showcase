import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { Badge, Button, SearchField } from "./components/ui";

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.978 };
const KAKAO_MAP_KEY = process.env.REACT_APP_KAKAO_MAP_JAVASCRIPT_KEY;
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";
const PLACE_STORAGE_KEY = "jigeum-review:selected-place";

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
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
    apiRequest("/api/auth/me").then(({ user: nextUser }) => setUser(nextUser)).catch(() => setUser(null)).finally(() => setAuthStatus("ready"));
    const handlePopState = () => setRoute(getRoute());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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

  async function logout() {
    await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
    setUser(null);
    navigate("/");
  }

  const shared = { user, authStatus, onLogin: () => navigate("/login"), onLogout: logout };
  if (route.name === "login") return <AuthPage user={user} onAuthenticated={(nextUser) => { setUser(nextUser); navigate("/"); }} onBack={() => navigate("/")} />;
  if (route.name === "detail") return <PlaceDetailPage {...shared} place={selectedPlace?.id === route.placeId ? selectedPlace : null} onBack={() => navigate("/")} />;
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
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapStatus, setMapStatus] = useState(KAKAO_MAP_KEY ? "loading" : "missing-key");
  const [mapError, setMapError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [places, setPlaces] = useState([]);
  const [placeStatus, setPlaceStatus] = useState("idle");
  const [placeError, setPlaceError] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [searchRadius, setSearchRadius] = useState(5000);
  const [locationStatus, setLocationStatus] = useState("idle");
  const selectedPlace = useMemo(() => places.find((place) => place.id === selectedPlaceId) || null, [places, selectedPlaceId]);

  useEffect(() => {
    if (!KAKAO_MAP_KEY || !mapElementRef.current) return;
    let mounted = true;
    loadKakaoMaps(KAKAO_MAP_KEY).then((maps) => {
      if (!mounted || !mapElementRef.current) return;
      const map = new maps.Map(mapElementRef.current, { center: new maps.LatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng), level: 5 });
      map.addControl(new maps.ZoomControl(), maps.ControlPosition.RIGHT);
      mapRef.current = map;
      setMapStatus("ready");
    }).catch((error) => { if (mounted) { setMapStatus("error"); setMapError(error.message); } });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || !window.kakao?.maps) return;
    const maps = window.kakao.maps;
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    if (!places.length) return;
    const bounds = new maps.LatLngBounds();
    places.forEach((place) => {
      const position = new maps.LatLng(place.y, place.x);
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = `map-marker ${place.id === selectedPlaceId ? "is-selected" : ""}`;
      marker.textContent = place.title;
      marker.addEventListener("click", () => setSelectedPlaceId(place.id));
      overlaysRef.current.push(new maps.CustomOverlay({ map: mapRef.current, position, content: marker, yAnchor: 1.25 }));
      bounds.extend(position);
    });
    mapRef.current.setBounds(bounds);
  }, [places, selectedPlaceId, mapStatus]);

  async function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setPlaceStatus("loading"); setPlaceError(""); setSelectedPlaceId("");
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
      const payload = await apiRequest(`/api/kakao/local?${params.toString()}`, { headers: {} });
      const nextPlaces = (payload.items || []).map(normalizePlace);
      setPlaces(nextPlaces); setSelectedPlaceId(nextPlaces[0]?.id || ""); setPlaceStatus("ready");
    } catch (error) { setPlaces([]); setPlaceStatus("error"); setPlaceError(error.message); }
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
      <header className="top-nav"><strong className="top-nav__brand">지금리뷰</strong><span>영수증 인증 리뷰 지도</span><AccountControl {...accountProps} /></header>
      <aside className="place-sidebar">
        <div className="sidebar-search"><h1>어디를 찾으세요?</h1><p>현재 보고 있는 지도 주변의 식당과 카페를 검색합니다.</p><SearchField value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onClear={() => setSearchInput("")} onSubmit={handleSearchSubmit} /><div className="search-scope"><span>지도 중심에서 약 {(searchRadius / 1000).toFixed(searchRadius < 1000 ? 1 : 0)}km 이내</span><button onClick={moveToCurrentLocation} type="button">{locationStatus === "loading" ? "위치 확인 중..." : "◎ 내 위치"}</button></div></div>
        <div className="place-results" aria-live="polite">
          {placeStatus === "idle" && <div className="empty-search"><strong>검색 결과가 여기에 표시됩니다</strong><span>식당이나 카페 이름을 입력해 주세요.</span></div>}
          {placeStatus === "loading" && <p className="sidebar-state">카카오맵에서 검색 중...</p>}
          {placeStatus === "error" && <p className="sidebar-state sidebar-state--error">{placeError}</p>}
          {placeStatus === "ready" && !places.length && <p className="sidebar-state">검색 결과가 없습니다.</p>}
          {places.map((place) => <button className={`place-list-item ${selectedPlaceId === place.id ? "is-selected" : ""}`} key={place.id} onClick={() => setSelectedPlaceId(place.id)} type="button"><span className="place-list-item__pin">⌖</span><span className="place-list-item__content"><strong>{place.title}</strong><span>{place.category}</span><small>{place.address || "주소 정보 없음"}</small></span><span aria-hidden="true">›</span></button>)}
        </div>
        {selectedPlace && <Button className="detail-button" onClick={() => onOpenPlace(selectedPlace)}>업체 상세 보기</Button>}
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
      const payload = await apiRequest(`/api/auth/${mode === "login" ? "login" : "signup"}`, { method: "POST", body: JSON.stringify(form) });
      onAuthenticated(payload.user);
    } catch (submitError) { setError(submitError.message); setStatus("idle"); }
  }

  return (
    <main className="auth-page">
      <button className="auth-back" onClick={onBack} type="button">← 지도로 돌아가기</button>
      <section className="auth-card">
        <div className="auth-brand"><span>지금리뷰</span><h1>{mode === "login" ? "다시 만나서 반가워요" : "신뢰할 수 있는 리뷰를 시작해요"}</h1><p>방문이 인증된 리뷰로 더 좋은 장소를 함께 발견합니다.</p></div>
        <div className="auth-tabs"><button className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(""); }} type="button">로그인</button><button className={mode === "signup" ? "is-active" : ""} onClick={() => { setMode("signup"); setError(""); }} type="button">회원가입</button></div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && <label><span>이름</span><input required minLength="2" maxLength="30" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="표시할 이름" /></label>}
          <label><span>이메일</span><input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></label>
          <label><span>비밀번호</span><input required minLength="8" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="8자 이상 입력" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <Button disabled={status === "loading"} type="submit">{status === "loading" ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}</Button>
        </form>
        <small className="auth-helper">비밀번호는 암호화된 해시로 저장되며 원문은 보관하지 않습니다.</small>
      </section>
    </main>
  );
}

function PlaceDetailPage({ place, user, authStatus, onLogin, onLogout, onBack }) {
  if (!place) return <main className="route-empty"><strong>업체 정보를 찾을 수 없습니다.</strong><p>지도에서 업체를 다시 검색해 주세요.</p><Button onClick={onBack}>지도로 돌아가기</Button></main>;
  const reviewAction = user ? () => window.alert("리뷰 작성 기능은 다음 단계에서 연결됩니다.") : onLogin;
  return (
    <main className="detail-page">
      <aside className="detail-nav"><div><strong>지금리뷰</strong><span>Verified places</span></div><nav><button onClick={onBack} type="button">⌖ 지도 검색</button><button className="is-active" type="button">▤ 업체 리뷰</button></nav><Button onClick={reviewAction}>{user ? "영수증 리뷰 등록하기" : "로그인하고 리뷰 쓰기"}</Button></aside>
      <div className="detail-content"><header className="detail-header"><button onClick={onBack} type="button">← 지도</button><AccountControl user={user} authStatus={authStatus} onLogin={onLogin} onLogout={onLogout} /></header>
        <section className="place-summary"><div><Badge>{place.category || "음식점"}</Badge><h1>{place.title}</h1><p>{place.address || place.oldAddress || "주소 정보 없음"}</p></div>{place.link && <a href={place.link} rel="noreferrer" target="_blank">카카오맵에서 보기 ↗</a>}</section>
        <section className="place-facts"><div><span>전화</span><strong>{place.telephone || "등록된 전화번호 없음"}</strong></div><div><span>분류</span><strong>{place.fullCategory || place.category}</strong></div><div><span>방문 인증 리뷰</span><strong>0개</strong></div></section>
        <section className="review-insight"><div><span>리뷰 분석</span><h2>아직 분석할 인증 리뷰가 없습니다</h2></div><p>영수증 OCR 인증을 통과한 리뷰가 등록되면 긍정·아쉬운 리뷰 비율과 가중 별점이 표시됩니다.</p><div className="empty-bars" aria-hidden="true">{[1,2,3,4,5].map((item) => <span key={item} />)}</div></section>
        <section className="review-section"><div className="review-section__header"><div><span>인증 리뷰</span><h2>방문자의 솔직한 경험</h2></div><Button onClick={reviewAction}>{user ? "리뷰 작성" : "로그인"}</Button></div><div className="review-empty"><strong>첫 번째 인증 리뷰를 기다리고 있어요</strong><p>영수증 이미지로 방문을 인증한 리뷰만 집계됩니다.</p></div></section>
      </div>
    </main>
  );
}

export default App;
