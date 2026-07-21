import { Fragment, useEffect, useRef, useState } from 'react';
import { loadNaverMaps } from '../utils/loadNaverMaps.js';
import { matchesSearch } from '../utils/search.js';
import { bakeryStatus, statusMeta } from '../utils/bakeryStatus.js';
import { daejeonCenter } from '../data/mapDefaults.js';
import Mascot from './Mascot.jsx';

const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

// 마커 컨텐츠 DOM을 직접 만든다. .map-marker/.dot/.label/.status-bubble은 index.css의 클래스를 그대로 재사용해
// placeholder였던 예전 지도 핀과 동일한 스타일을 유지한다.
function buildMarkerContent(bakery, { selected, dim }) {
  const el = document.createElement('div');
  el.className = `map-marker${selected ? ' selected' : ''}${dim ? ' dim' : ''}`;

  const meta = statusMeta(bakeryStatus(bakery));
  if (meta) {
    const bubble = document.createElement('span');
    bubble.className = `status-bubble ${meta.cls}`;
    bubble.textContent = meta.label;
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
      const icon = { content: buildMarkerContent(b, { selected, dim }), anchor: new naverMaps.Point(13, 26) };
      const existing = markersRef.current.get(b.id);

      if (existing) {
        existing.setIcon(icon);
      } else {
        const marker = new naverMaps.Marker({
          position: new naverMaps.LatLng(b.lat, b.lng),
          map: mapRef.current,
          icon,
        });
        naverMaps.Event.addListener(marker, 'click', () => onToggleSelect(b.id));
        markersRef.current.set(b.id, marker);
      }
    });
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
