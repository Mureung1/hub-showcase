import { useEffect, useRef, useState } from 'react';
import './KakaoMap.css';

const DEFAULT_CENTER = { latitude: 37.5665, longitude: 126.9780 };
let kakaoLoader;

function loadKakaoMap() {
  const appKey = import.meta.env.VITE_KAKAO_MAP_APP_KEY;
  if (!appKey) return Promise.reject(new Error('카카오맵 앱 키가 설정되지 않았습니다.'));
  if (window.kakao?.maps) return Promise.resolve(window.kakao);
  if (kakaoLoader) return kakaoLoader;
  kakaoLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => reject(new Error('카카오맵 SDK를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return kakaoLoader;
}

export default function KakaoMap({ latitude, longitude, onLocationChange, height = 220 }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const latestOptionsRef = useRef(null);
  const [error, setError] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const editable = Boolean(onLocationChange);
  latestOptionsRef.current = { latitude, longitude, editable, onLocationChange };

  // SDK 지도 인스턴스는 한 번만 만들고, 좌표 변경은 아래 별도 effect에서 반영한다.
  useEffect(() => {
    let mounted = true;
    loadKakaoMap().then((kakao) => {
      if (!mounted || !containerRef.current) return;
      const initial = latestOptionsRef.current;
      const position = new kakao.maps.LatLng(initial.latitude || DEFAULT_CENTER.latitude, initial.longitude || DEFAULT_CENTER.longitude);
      const map = new kakao.maps.Map(containerRef.current, { center: position, level: 3 });
      const marker = new kakao.maps.Marker({ position, draggable: initial.editable });
      marker.setMap(map);
      mapRef.current = map;
      markerRef.current = marker;
      const updateLocation = (latLng) => {
        marker.setPosition(latLng);
        const next = { latitude: latLng.getLat(), longitude: latLng.getLng(), address: '' };
        const geocoder = new kakao.maps.services.Geocoder();
        geocoder.coord2Address(next.longitude, next.latitude, (result, status) => {
          if (status === kakao.maps.services.Status.OK) next.address = result[0]?.road_address?.address_name || result[0]?.address?.address_name || '';
          latestOptionsRef.current.onLocationChange(next);
        });
      };
      if (initial.editable) {
        kakao.maps.event.addListener(map, 'click', (event) => updateLocation(event.latLng));
        kakao.maps.event.addListener(marker, 'dragend', () => updateLocation(marker.getPosition()));
      }
    }).catch((loadError) => mounted && setError(loadError.message));
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!window.kakao?.maps || !mapRef.current || !markerRef.current || !latitude || !longitude) return;
    const position = new window.kakao.maps.LatLng(latitude, longitude);
    markerRef.current.setPosition(position);
    mapRef.current.setCenter(position);
  }, [latitude, longitude]);

  function searchAddress(event) {
    event.preventDefault();
    if (!addressQuery.trim()) return;
    loadKakaoMap().then((kakao) => {
      const geocoder = new kakao.maps.services.Geocoder();
      geocoder.addressSearch(addressQuery, (result, status) => {
        if (status !== kakao.maps.services.Status.OK || !result[0]) {
          setError('주소를 찾지 못했습니다. 다른 주소로 다시 검색해 주세요.');
          return;
        }
        const latitude = Number(result[0].y);
        const longitude = Number(result[0].x);
        const position = new kakao.maps.LatLng(latitude, longitude);
        markerRef.current?.setPosition(position);
        mapRef.current?.setCenter(position);
        onLocationChange?.({ latitude, longitude, address: result[0].road_address?.address_name || result[0].address_name });
      });
    }).catch((loadError) => setError(loadError.message));
  }

  if (error) return <div className="td-kakao-map__notice" style={{ height }}>
    {error}<br />
    {error.includes('앱 키가 설정되지')
      ? 'frontend/.env의 VITE_KAKAO_MAP_APP_KEY를 확인한 뒤 Vite를 재시작해 주세요.'
      : '카카오 Developers의 JavaScript 키 상태와 JavaScript SDK 도메인에 현재 주소를 등록했는지 확인해 주세요.'}
  </div>;
  return <div className="td-kakao-map__container">
    {editable && <form className="td-kakao-map__search" onSubmit={searchAddress}>
      <input value={addressQuery} onChange={(event) => setAddressQuery(event.target.value)} placeholder="주소로 위치 검색" />
      <button type="submit">검색</button>
    </form>}
    <div ref={containerRef} className="td-kakao-map" style={{ height }} aria-label="카카오 픽업 위치 지도" />
  </div>;
}
