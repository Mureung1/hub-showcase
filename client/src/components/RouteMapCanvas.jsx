import { useEffect, useRef, useState } from 'react';
import { loadNaverMaps } from '../utils/loadNaverMaps.js';
import Mascot from './Mascot.jsx';

const CLIENT_ID = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;

// 경로결과 화면 전용 — 실제 네이버지도 위에 출발지부터 방문 순서대로 번호 마커를 찍고 선으로 잇는다.
// MapScreen의 NaverMapCanvas는 "전체 빵집을 둘러보며 선택"하는 용도라 클릭 시 팝업이 뜨는 등
// 이 화면과는 다른 상호작용을 가지고 있어서, 여기는 읽기 전용 경로 미리보기만 하는 가벼운 컴포넌트로
// 따로 뺐다.
function buildPinContent(point, index, color) {
  const wrap = document.createElement('div');
  wrap.className = 'route-map-pin';

  const dot = document.createElement('span');
  dot.className = 'route-map-pin-dot';
  dot.style.background = point.isOrigin ? 'var(--ink)' : color;
  if (point.isOrigin) {
    dot.innerHTML =
      '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>';
  } else {
    dot.textContent = String(index);
  }
  wrap.appendChild(dot);

  const label = document.createElement('span');
  label.className = 'route-map-pin-label';
  label.textContent = point.name;
  wrap.appendChild(label);

  return wrap;
}

// points: [{ id, lat, lng, name, isOrigin }, ...] — 출발지부터 방문 순서 그대로.
export default function RouteMapCanvas({ points, color }) {
  const mountRef = useRef(null);
  const [status, setStatus] = useState(CLIENT_ID ? 'loading' : 'missing-key');

  useEffect(() => {
    if (!CLIENT_ID || points.length === 0) return;
    let cancelled = false;
    let map;
    const markers = [];
    let polyline;

    loadNaverMaps(CLIENT_ID)
      .then((naverMaps) => {
        if (cancelled || !mountRef.current) return;

        map = new naverMaps.Map(mountRef.current, {
          center: new naverMaps.LatLng(points[0].lat, points[0].lng),
          zoom: 14,
          zoomControl: true,
          zoomControlOptions: { position: naverMaps.Position.TOP_RIGHT },
        });

        const bounds = new naverMaps.LatLngBounds();
        const path = points.map((p) => {
          const position = new naverMaps.LatLng(p.lat, p.lng);
          bounds.extend(position);
          return position;
        });

        polyline = new naverMaps.Polyline({
          map,
          path,
          strokeColor: color,
          strokeWeight: 4,
          strokeOpacity: 0.85,
        });

        points.forEach((p, i) => {
          const marker = new naverMaps.Marker({
            position: path[i],
            map,
            icon: { content: buildPinContent(p, i, color), anchor: new naverMaps.Point(12, 12) },
            zIndex: p.isOrigin ? 200 : 100,
          });
          markers.push(marker);
        });

        // 점이 하나뿐이면 fitBounds가 과도하게 확대하므로(반경 0) 그때만 건너뛴다.
        if (points.length > 1) map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      markers.forEach((m) => {
        try {
          m.setMap(null);
        } catch {
          // 인증 실패 등으로 반쯤 초기화된 지도의 마커는 정리 중 예외를 던질 수 있다 — 무시해도 안전.
        }
      });
      try {
        polyline?.setMap(null);
      } catch {
        // 위와 동일한 이유로 무시.
      }
    };
  }, [points, color]);

  return (
    <>
      <div className="route-map-mount" ref={mountRef} />
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
          {status === 'error' && <p>지도를 불러오지 못했어요.</p>}
        </div>
      )}
    </>
  );
}
