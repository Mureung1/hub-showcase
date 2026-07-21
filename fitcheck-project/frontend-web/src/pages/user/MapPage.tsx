import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LocateFixed, LoaderCircle } from 'lucide-react';
import type { GymPlace } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import GymBottomSheet from '../../features/map/GymBottomSheet';
import NaverMapView from '../../features/map/NaverMapView';
import { reverseGeocodeAreaLabel } from '../../features/map/reverseGeocode';
import { useUserLocation } from '../../features/map/useUserLocation';
import { syncNearbyGyms } from '../../services/gymsApi';
import '../../features/map/map.css';

export default function MapPage() {
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState('');
  const { location, status, message, locateToken, requestLocation } = useUserLocation();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSyncInfo('');

      try {
        const areaLabel = await reverseGeocodeAreaLabel(location.lat, location.lng);
        const result = await syncNearbyGyms({
          lat: location.lat,
          lng: location.lng,
          radiusKm: 3,
          areaLabel,
        });

        if (cancelled) return;

        setGyms(result.gyms);
        setSelectedGymId((prev) => {
          if (prev && result.gyms.some((gym) => gym.id === prev)) return prev;
          return result.gyms[0]?.id ?? null;
        });

        if (result.synced > 0) {
          setSyncInfo(`네이버에서 ${result.synced}곳을 찾아 저장했습니다.`);
        } else if (result.gyms.length === 0) {
          setSyncInfo('주변 3km 내 헬스장을 찾지 못했습니다. 위치를 바꿔 다시 시도해 보세요.');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : '헬스장 목록을 불러오지 못했습니다.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [location.lat, location.lng]);

  const selectedGym = useMemo(
    () => gyms.find((gym) => gym.id === selectedGymId) ?? null,
    [gyms, selectedGymId],
  );

  return (
    <div className="map-page">
      <NaverMapView
        gyms={gyms}
        selectedGymId={selectedGymId}
        onSelectGym={setSelectedGymId}
        userLocation={location}
        locateToken={locateToken}
      />

      <div className="map-locate-stack">
        {(message || syncInfo) && (
          <p
            className={`map-locate-banner map-locate-banner-${status}`}
            role="status"
          >
            {syncInfo || message}
          </p>
        )}
        {error && (
          <p className="map-locate-banner map-locate-banner-fallback" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {error}
          </p>
        )}
        <button
          type="button"
          className="map-locate-btn"
          onClick={requestLocation}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <LoaderCircle size={18} className="map-locate-spin" />
          ) : (
            <LocateFixed size={18} />
          )}
          내 위치
        </button>
      </div>

      {loading && gyms.length === 0 ? (
        <div className="map-loading-overlay" role="status">
          <LoaderCircle size={24} className="map-locate-spin" />
          <span>주변 헬스장을 검색하는 중…</span>
        </div>
      ) : (
        <GymBottomSheet
          gyms={gyms}
          selectedGym={selectedGym}
          onSelectGym={setSelectedGymId}
          onConsult={() => setConsultOpen(true)}
          refreshing={loading && gyms.length > 0}
        />
      )}
      {selectedGym && (
        <ConsultRequestSheet
          open={consultOpen}
          gym={selectedGym}
          onClose={() => setConsultOpen(false)}
        />
      )}
    </div>
  );
}
