import { useEffect, useRef, useState } from "react";
import Miricat from "../Miricat";
import { hit } from "../../lib/matching";

// 네이버 지도 JS는 전역 <script>로 한 번만 로드한다 — 중복 로드 방지용 공유 Promise.
// 클라이언트 ID는 공개돼도 되는 값(리퍼러 제한으로 보호) — NCP 콘솔에 서비스 URL 등록 필요.
let naverLoading = null;
function loadNaverMaps() {
  if (window.naver?.maps) return Promise.resolve();
  if (!naverLoading) {
    naverLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${import.meta.env.VITE_NAVER_MAP_CLIENT_ID}`;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return naverLoading;
}

function dotMarker(color, size = 12) {
  return {
    content: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
    anchor: new window.naver.maps.Point(size / 2, size / 2),
  };
}

// 실지도: 등록 때 저장한 좌표열(points)로 경로 폴리라인 + 영향 정류장 빨간 마커.
export default function RealMap({ points, hits, affected }) {
  const boxRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let map;
    loadNaverMaps()
      .then(() => {
        const { naver } = window;
        const latlngs = points.map((p) => new naver.maps.LatLng(p.y, p.x));
        const bounds = latlngs.reduce(
          (b, ll) => (b.extend(ll), b),
          new naver.maps.LatLngBounds(latlngs[0], latlngs[0])
        );
        map = new naver.maps.Map(boxRef.current, { center: bounds.getCenter(), zoom: 12 });
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 70, left: 50 });

        new naver.maps.Polyline({
          map, path: latlngs,
          strokeColor: "#3E7CB1", strokeWeight: 5, strokeOpacity: 0.9,
        });
        // 출발(흰)·도착(검) 점
        new naver.maps.Marker({ map, position: latlngs[0], icon: dotMarker("#ffffff") });
        new naver.maps.Marker({ map, position: latlngs[latlngs.length - 1], icon: dotMarker("#33261A") });
        // 영향 정류장: 공지와 겹친 값(hits)에 걸리는 정류장만 빨간 점
        for (const p of points) {
          if (!p.name) continue;
          if ([...hits].some((h) => hit(h, p.name))) {
            new naver.maps.Marker({ map, position: new naver.maps.LatLng(p.y, p.x), icon: dotMarker("#E4572E", 14), title: p.name });
          }
        }
      })
      .catch(() => setFailed(true));
    return () => map?.destroy?.();
  }, [points, hits]);

  if (failed) {
    return (
      <div className="report-map" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#8B7863", fontSize: 13 }}>지도를 불러오지 못했어요.</p>
      </div>
    );
  }

  return (
    <div className="report-map">
      <div ref={boxRef} style={{ position: "absolute", inset: 0 }} />
      <div className="map-badge">
        <Miricat size={24} />
        <span className="cap">미리캣이 지켜보는 중</span>
      </div>
      <div className="map-legend">
        <span className="lg"><i></i>내 경로</span>
        {affected && <span className="lg red"><i style={{ borderRadius: "50%", width: 10, borderTopWidth: 8 }}></i>영향 정류장</span>}
      </div>
    </div>
  );
}
