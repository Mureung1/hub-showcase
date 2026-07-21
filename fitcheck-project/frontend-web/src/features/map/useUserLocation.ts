import { useCallback, useState } from 'react';
import { MOCK_USER_LOCATION } from '../../data/userMock';

export type LocationSource = 'mock' | 'gps';

export interface UserLocationState {
  lat: number;
  lng: number;
  label: string;
  source: LocationSource;
}

export type LocateStatus = 'idle' | 'loading' | 'granted' | 'fallback';

const MOCK_LOCATION: UserLocationState = {
  lat: MOCK_USER_LOCATION.lat,
  lng: MOCK_USER_LOCATION.lng,
  label: MOCK_USER_LOCATION.label,
  source: 'mock',
};

function fallbackMessage(code?: number) {
  if (code === 1) {
    return '위치 권한이 거부되어 목업 위치(부산진구 서면)를 사용합니다.';
  }
  if (code === 2) {
    return '위치를 확인할 수 없어 목업 위치(부산진구 서면)를 사용합니다.';
  }
  if (code === 3) {
    return '위치 요청이 시간 초과되어 목업 위치(부산진구 서면)를 사용합니다.';
  }
  return '이 환경에서는 위치를 사용할 수 없어 목업 위치(부산진구 서면)를 사용합니다.';
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocationState>(MOCK_LOCATION);
  const [status, setStatus] = useState<LocateStatus>('idle');
  const [message, setMessage] = useState('');
  const [locateToken, setLocateToken] = useState(0);

  const requestLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocation(MOCK_LOCATION);
      setStatus('fallback');
      setMessage(fallbackMessage());
      setLocateToken((token) => token + 1);
      return;
    }

    setStatus('loading');
    setMessage('현재 위치를 확인하는 중…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: '내 위치',
          source: 'gps',
        });
        setStatus('granted');
        setMessage('실제 GPS 위치로 이동했습니다. 주변 헬스장을 네이버에서 검색합니다.');
        setLocateToken((token) => token + 1);
      },
      (error) => {
        setLocation(MOCK_LOCATION);
        setStatus('fallback');
        setMessage(fallbackMessage(error.code));
        setLocateToken((token) => token + 1);
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 5_000,
      },
    );
  }, []);

  return {
    location,
    status,
    message,
    locateToken,
    requestLocation,
  };
}
