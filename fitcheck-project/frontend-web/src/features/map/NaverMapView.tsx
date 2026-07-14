import { useEffect, useRef, useState } from 'react';
import type { GymPlace } from '../../data/userMock';
import { MOCK_USER_LOCATION } from '../../data/userMock';
import { getNaverMapClientId, loadNaverMaps } from './loadNaverMaps';
import './map.css';

interface NaverMapViewProps {
  gyms: GymPlace[];
}

type LoadState = 'idle' | 'loading' | 'ready' | 'missing-key' | 'error';

function gymMarkerHtml(name: string) {
  return `
    <div class="map-marker map-marker-gym" title="${name}">
      <span class="map-marker-pin"></span>
      <span class="map-marker-label">${name}</span>
    </div>
  `;
}

function userMarkerHtml(label: string) {
  return `
    <div class="map-marker map-marker-user" title="${label}">
      <span class="map-marker-pin"></span>
      <span class="map-marker-label">${label}</span>
    </div>
  `;
}

export default function NaverMapView({ gyms }: NaverMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const clientId = getNaverMapClientId();
    if (!clientId) {
      setState('missing-key');
      return;
    }

    let cancelled = false;
    setState('loading');

    loadNaverMaps(clientId)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(MOCK_USER_LOCATION.lat, MOCK_USER_LOCATION.lng),
          zoom: 15,
          minZoom: 12,
          zoomControl: true,
          mapDataControl: false,
        });
        mapRef.current = map;

        const userMarker = new maps.Marker({
          position: new maps.LatLng(MOCK_USER_LOCATION.lat, MOCK_USER_LOCATION.lng),
          map,
          title: MOCK_USER_LOCATION.label,
          zIndex: 100,
          icon: {
            content: userMarkerHtml(MOCK_USER_LOCATION.label),
            anchor: new maps.Point(12, 12),
          },
        });

        const gymMarkers = gyms.map(
          (gym) =>
            new maps.Marker({
              position: new maps.LatLng(gym.lat, gym.lng),
              map,
              title: gym.name,
              icon: {
                content: gymMarkerHtml(gym.name),
                anchor: new maps.Point(12, 12),
              },
            }),
        );

        markersRef.current = [userMarker, ...gymMarkers];
        setState('ready');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState('error');
        setErrorMessage(
          error instanceof Error ? error.message : '지도를 불러오지 못했습니다.',
        );
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      mapRef.current?.destroy();
      mapRef.current = null;
    };
  }, [gyms]);

  return (
    <div className="naver-map-shell">
      <div ref={containerRef} className="naver-map-canvas" aria-label="주변 헬스장 지도" />

      {state === 'missing-key' && (
        <div className="naver-map-overlay">
          <strong>네이버 지도 API 키가 필요합니다</strong>
          <p>
            `frontend-web/.env.local`에 `VITE_NAVER_MAP_CLIENT_ID`를 넣고 개발 서버를
            재시작하세요. NCP에서 Dynamic Map을 활성화하고 Web Service URL에
            `http://localhost:5173`을 등록해야 합니다.
          </p>
        </div>
      )}

      {state === 'loading' && (
        <div className="naver-map-overlay naver-map-overlay-soft">
          <strong>지도 불러오는 중…</strong>
        </div>
      )}

      {state === 'error' && (
        <div className="naver-map-overlay">
          <strong>지도를 표시할 수 없습니다</strong>
          <p>{errorMessage}</p>
          <p>
            Client ID·Web Service URL 등록을 확인한 뒤 개발 서버를 다시 실행해 보세요.
          </p>
        </div>
      )}
    </div>
  );
}
