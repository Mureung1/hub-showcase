import { Fragment, useEffect, useRef, useState } from 'react';
import { loadNaverMaps } from '../utils/loadNaverMaps.js';
import { matchesSearch } from '../utils/search.js';
import { bakeryStatus, statusMeta } from '../utils/bakeryStatus.js';
import { daejeonCenter } from '../data/mapDefaults.js';
import Mascot from './Mascot.jsx';

const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

// 마커 컨텐츠 DOM을 직접 만든다. .map-marker/.dot/.label/.status-bubble은 index.css의 클래스를 그대로 재사용해
// placeholder였던 예전 지도 핀과 동일한 스타일을 유지한다.
// 클릭 즉시 살짝 튀는 피드백. 클래스를 지웠다가(리플로우 강제) 다시 붙이는 방식이라
// 연속 클릭해도 매번 애니메이션이 재시작된다 — React 상태 없이 순수 DOM만으로 처리.
function bounceMarker(el) {
  el.classList.remove('marker-bounce');
  void el.offsetWidth;
  el.classList.add('marker-bounce');
}

// 클릭 → onToggleSelect → selectedIds 변경 → 이 마커의 content DOM이 통째로 새로 만들어지는
// 흐름이라(선택 표시를 바꾸려면 아이콘을 다시 그려야 해서), bounceMarker로 붙인 클래스가 곧바로
// 갈아치워져 버린다. 그래서 "방금 클릭된 빵집 id"를 새로 만드는 엘리먼트에 처음부터 반영해준다
// (justClicked=true면 태어날 때부터 marker-bounce를 달고 나와서, 새 엘리먼트에서도 애니메이션이 그대로 재생됨).
function buildMarkerContent(bakery, { selected, dim, justClicked }) {
  const el = document.createElement('div');
  el.className = `map-marker${selected ? ' selected' : ''}${dim ? ' dim' : ''}${justClicked ? ' marker-bounce' : ''}`;
  el.addEventListener('click', () => bounceMarker(el));

  const meta = statusMeta(bakeryStatus(bakery));
  if (meta) {
    const bubble = document.createElement('span');
    bubble.className = `status-bubble ${meta.cls}`;
    bubble.textContent = meta.label;
    // 여러 배지가 동시에 떠 있을 때 전부 같은 박자로 움직이면 기계적으로 보여서, 빵집 id로
    // 0~0.9s 사이 시작 시점을 결정적으로 어긋나게 준다(매 렌더마다 값이 안 바뀌게).
    bubble.style.animationDelay = `${(bakery.id % 10) * 0.1}s`;
    el.appendChild(bubble);
  }

  const dot = document.createElement('span');
  dot.className = 'dot';
  el.appendChild(dot);

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = bakery.name;
  el.appendChild(label);

  return el;
}

// 빵집 핀과 구분되는 "내 위치" 마커(원형 점 + 라벨).
function buildUserMarkerContent(label) {
  const el = document.createElement('div');
  el.className = 'map-marker-me';

  const pulse = document.createElement('span');
  pulse.className = 'pulse';
  el.appendChild(pulse);

  const dot = document.createElement('span');
  dot.className = 'dot';
  el.appendChild(dot);

  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;
  el.appendChild(labelEl);

  return el;
}

// TODO(2주차): "빵집 데이터 수집" 완료 후 bakeries.js의 mock lat/lng을 실제 좌표로 교체.
export default function NaverMapCanvas({
  bakeries,
  selectedIds,
  searchQuery,
  onToggleSelect,
  userLocation,
  userLocationLabel,
  onMapClick,
}) {
  const mountRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const userMarkerRef = useRef(null);
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'missing-key');
  // 방금 클릭한 빵집 id. 클릭 → onToggleSelect → 리렌더로 마커 아이콘이 통째로 새로 그려지는
  // 흐름이라, 클릭 피드백(marker-bounce)을 "새로 만드는 엘리먼트"에 처음부터 실어 보내는 용도.
  const justClickedIdRef = useRef(null);

  // 지도 클릭 리스너는 마운트 시 한 번만 붙기 때문에, 매 렌더마다 바뀔 수 있는 콜백은
  // ref로 최신값을 참조해서 stale closure를 피한다.
  const onMapClickRef = useRef(onMapClick);
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  }, [onMapClick]);

  // 인증 실패는 지도가 'ready'로 표시된 다음에야 비동기로 도착할 수 있다(아래 참고).
  // 그 사이에 만들어진 마커는 인증되지 않은 반쪽짜리 지도 인스턴스에 붙어 있어 내부 상태가 일부 null이라,
  // 이후 SDK가 그 마커를 참조/정리하려 하면(setMap(null) 등) SDK 내부에서 예외를 던지고 그게 그대로
  // React 트리를 깨뜨린다. 그래서 지도/마커 정리는 항상 이 헬퍼로만 하고 try/catch로 감싼다.
  const teardownMap = () => {
    markersRef.current.forEach((marker) => {
      try {
        marker.setMap(null);
      } catch {
        // 인증 실패로 반쯤 초기화된 지도의 마커는 정리 중 SDK 내부에서 예외를 던질 수 있다 — 무시해도 안전.
      }
    });
    markersRef.current.clear();
    try {
      userMarkerRef.current?.setMap(null);
    } catch {
      // 위와 동일한 이유로 무시.
    }
    userMarkerRef.current = null;
    mapRef.current = null;
  };

  // 지도 인스턴스는 최초 1회만 생성
  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    // 네이버 지도 SDK는 인증 실패를 예외로 던지지 않고, 스크립트 로드 후 비동기로
    // window.navermap_authFailure()를 호출해 알려준다(NCP Maps API v3 공식 훅).
    // 이 콜백이 없으면 스크립트 로드 자체는 성공했으니 'ready'로 남아 빈 지도만 보이게 된다.
    window.navermap_authFailure = () => {
      if (cancelled) return;
      teardownMap();
      setStatus('error');
    };

    loadNaverMaps(CLIENT_ID)
      .then((naverMaps) => {
        if (cancelled || !mountRef.current) return;
        mapRef.current = new naverMaps.Map(mountRef.current, {
          center: new naverMaps.LatLng(daejeonCenter.lat, daejeonCenter.lng),
          zoom: 13,
          zoomControl: true,
          zoomControlOptions: { position: naverMaps.Position.TOP_RIGHT },
        });
        // 빵집 마커 클릭은 각 마커 자체 리스너가 처리하고 지도 배경 클릭까지는 전파되지 않으므로,
        // 여기서는 "빈 지도를 클릭 = 내 위치를 직접 지정"으로 다뤄도 안전하다.
        naverMaps.Event.addListener(mapRef.current, 'click', (e) => {
          onMapClickRef.current?.({ lat: e.coord.lat(), lng: e.coord.lng() });
        });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      teardownMap();
    };
  }, []);

  // 지도가 준비된 이후 선택/검색 상태가 바뀔 때마다 빵집 마커를 생성·갱신
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current) return;
    const naverMaps = window.naver.maps;

    bakeries.forEach((b) => {
      const selected = selectedIds.has(b.id);
      const dim = !matchesSearch(b, searchQuery);
      const justClicked = justClickedIdRef.current === b.id;
      const icon = {
        content: buildMarkerContent(b, { selected, dim, justClicked }),
        anchor: new naverMaps.Point(13, 26),
      };
      const existing = markersRef.current.get(b.id);

      if (existing) {
        existing.setIcon(icon);
      } else {
        const marker = new naverMaps.Marker({
          position: new naverMaps.LatLng(b.lat, b.lng),
          map: mapRef.current,
          icon,
        });
        naverMaps.Event.addListener(marker, 'click', () => {
          justClickedIdRef.current = b.id;
          onToggleSelect(b.id);
        });
        markersRef.current.set(b.id, marker);
      }
    });
    // 이번 렌더에 반영했으니 리셋 — 안 그러면 이후 무관한 재렌더(검색어 변경 등)에서도 계속 튄다.
    justClickedIdRef.current = null;
  }, [status, bakeries, selectedIds, searchQuery, onToggleSelect]);

  // 내 위치 마커는 userLocation이 바뀔 때마다 위치/라벨을 갱신 (빵집 마커와 별도 관리)
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !userLocation) return;
    const naverMaps = window.naver.maps;
    const icon = { content: buildUserMarkerContent(userLocationLabel), anchor: new naverMaps.Point(9, 9) };
    const position = new naverMaps.LatLng(userLocation.lat, userLocation.lng);

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(position);
      userMarkerRef.current.setIcon(icon);
    } else {
      userMarkerRef.current = new naverMaps.Marker({ position, map: mapRef.current, icon, zIndex: 200 });
    }
  }, [status, userLocation, userLocationLabel]);

  return (
    <Fragment>
      {/* 네이버 SDK가 이 컨테이너의 내부 DOM을 직접 소유/조작하므로 React 자식은 절대 넣지 않는다
          (같이 넣으면 React reconciliation과 SDK의 직접 DOM 조작이 충돌해 이후 상태 업데이트가 반영되지 않는다). */}
      <div className="map-mount" ref={mountRef} />
      {status !== 'ready' && (
        <div className="map-status">
          <Mascot variant={status === 'missing-key' ? 'pointing' : 'default'} />
          {status === 'missing-key' && (
            <p>
              네이버 지도 API 키가 설정되지 않았어요.
              <br />
              <code>client/.env</code>의 <code>VITE_NAVER_MAP_CLIENT_ID</code>를 채워주세요.
            </p>
          )}
          {status === 'loading' && <p>지도를 불러오는 중이에요...</p>}
          {status === 'error' && (
            <p>
              지도를 불러오지 못했어요.
              <br />
              API 키와 네트워크 상태를 확인해주세요.
            </p>
          )}
        </div>
      )}
    </Fragment>
  );
}
