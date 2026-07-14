import { useEffect, useRef, useState } from 'react';
import type { GymPlace } from '../../data/userMock';
import type { UserLocationState } from './useUserLocation';
import { getNaverMapClientId, loadNaverMaps } from './loadNaverMaps';
import './map.css';

interface NaverMapViewProps {
  gyms: GymPlace[];
  selectedGymId: string | null;
  onSelectGym: (gymId: string) => void;
  userLocation: UserLocationState;
  locateToken: number;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'missing-key' | 'error';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function gymMarkerHtml(name: string, selected: boolean) {
  const safeName = escapeHtml(name);
  return `
    <div class="map-marker map-marker-gym${selected ? ' is-selected' : ''}" title="${safeName}">
      <span class="map-marker-pin"></span>
      <span class="map-marker-label">${safeName}</span>
    </div>
  `;
}

function userMarkerHtml(label: string) {
  const safeLabel = escapeHtml(label);
  return `
    <div class="map-marker map-marker-user" title="${safeLabel}">
      <span class="map-marker-pin"></span>
      <span class="map-marker-label">${safeLabel}</span>
    </div>
  `;
}

export default function NaverMapView({
  gyms,
  selectedGymId,
  onSelectGym,
  userLocation,
  locateToken,
}: NaverMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const mapsApiRef = useRef<typeof naver.maps | null>(null);
  const userMarkerRef = useRef<naver.maps.Marker | null>(null);
  const gymMarkersRef = useRef<Map<string, naver.maps.Marker>>(new Map());
  const onSelectGymRef = useRef(onSelectGym);
  const userLocationRef = useRef(userLocation);
  const [state, setState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    onSelectGymRef.current = onSelectGym;
  }, [onSelectGym]);

  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

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

        const initial = userLocationRef.current;
        mapsApiRef.current = maps;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(initial.lat, initial.lng),
          zoom: 15,
          minZoom: 12,
          zoomControl: true,
          mapDataControl: false,
        });
        mapRef.current = map;

        userMarkerRef.current = new maps.Marker({
          position: new maps.LatLng(initial.lat, initial.lng),
          map,
          title: initial.label,
          zIndex: 100,
          icon: {
            content: userMarkerHtml(initial.label),
            anchor: new maps.Point(12, 12),
          },
        });

        const nextMarkers = new Map<string, naver.maps.Marker>();
        gyms.forEach((gym) => {
          const marker = new maps.Marker({
            position: new maps.LatLng(gym.lat, gym.lng),
            map,
            title: gym.name,
            zIndex: 10,
            icon: {
              content: gymMarkerHtml(gym.name, false),
              anchor: new maps.Point(12, 12),
            },
          });

          maps.Event.addListener(marker, 'click', () => {
            onSelectGymRef.current(gym.id);
          });

          nextMarkers.set(gym.id, marker);
        });
        gymMarkersRef.current = nextMarkers;
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
      gymMarkersRef.current.forEach((marker) => marker.setMap(null));
      gymMarkersRef.current.clear();
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      mapRef.current?.destroy();
      mapRef.current = null;
      mapsApiRef.current = null;
    };
  }, [gyms]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const marker = userMarkerRef.current;
    if (!maps || !marker || state !== 'ready') return;

    const position = new maps.LatLng(userLocation.lat, userLocation.lng);
    marker.setPosition(position);
    marker.setTitle(userLocation.label);
    marker.setIcon({
      content: userMarkerHtml(userLocation.label),
      anchor: new maps.Point(12, 12),
    });
  }, [userLocation, state]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map || state !== 'ready' || locateToken === 0) return;

    map.panTo(new maps.LatLng(userLocation.lat, userLocation.lng));
  }, [locateToken, userLocation.lat, userLocation.lng, state]);

  useEffect(() => {
    const maps = mapsApiRef.current;
    const map = mapRef.current;
    if (!maps || !map || state !== 'ready') return;

    const selected = gyms.find((gym) => gym.id === selectedGymId) ?? null;

    gymMarkersRef.current.forEach((marker, gymId) => {
      const gym = gyms.find((item) => item.id === gymId);
      if (!gym) return;
      const isSelected = gymId === selectedGymId;
      marker.setIcon({
        content: gymMarkerHtml(gym.name, isSelected),
        anchor: new maps.Point(12, 12),
      });
      marker.setZIndex(isSelected ? 200 : 10);
    });

    if (selected) {
      map.panTo(new maps.LatLng(selected.lat, selected.lng));
    }
  }, [gyms, selectedGymId, state]);

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
