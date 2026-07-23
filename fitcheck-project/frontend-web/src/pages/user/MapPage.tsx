import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, LocateFixed, LoaderCircle } from 'lucide-react';
import type { GymPlace } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import GymBottomSheet from '../../features/map/GymBottomSheet';
import NaverMapView from '../../features/map/NaverMapView';
import { reverseGeocodeAreaLabel } from '../../features/map/reverseGeocode';
import { useUserLocation } from '../../features/map/useUserLocation';
import { syncNearbyGyms, fetchRecommendedGyms } from '../../services/gymsApi';
import '../../features/map/map.css';

export default function MapPage() {
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [consultOpen, setConsultOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInfo, setSyncInfo] = useState('');
  const [matchHint, setMatchHint] = useState('');
  const { location, status, message, locateToken, requestLocation } = useUserLocation();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setSyncInfo('');

      try {
        const areaLabel = await reverseGeocodeAreaLabel(location.lat, location.lng);
        const syncResult = await syncNearbyGyms({
          lat: location.lat,
          lng: location.lng,
          radiusKm: 3,
          areaLabel,
        });

        let gymsToShow = syncResult.gyms;

        try {
          const recommended = await fetchRecommendedGyms({
            lat: location.lat,
            lng: location.lng,
            radiusKm: 3,
            limit: 50,
          });
          gymsToShow = recommended.gyms;

          const profile = recommended.interestProfile;
          if (profile.totalViews > 0) {
            const bodyPart = profile.topBodyParts[0]?.label;
            const goal = profile.topGoals[0]?.label;
            if (bodyPart && goal) {
              setMatchHint(`${bodyPart}·${goal} 강좌 시청 기반으로 매칭했습니다.`);
            } else {
              setMatchHint('PT 강좌 시청 기록을 반영해 순위를 정렬했습니다.');
            }
          } else {
            setMatchHint('강좌를 시청하면 취향에 맞는 헬스장 순위가 올라갑니다.');
          }
        } catch {
          setMatchHint('');
        }

        if (cancelled) return;

        setGyms(gymsToShow);
        setSelectedGymId((prev) => {
          if (prev && gymsToShow.some((gym) => gym.id === prev)) return prev;
          return gymsToShow[0]?.id ?? null;
        });

        if (syncResult.synced > 0) {
          setSyncInfo(`네이버에서 ${syncResult.synced}곳을 찾아 저장했습니다.`);
        } else if (gymsToShow.length === 0) {
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
        {(message || syncInfo || matchHint) && (
          <p
            className={`map-locate-banner map-locate-banner-${status}`}
            role="status"
          >
            {syncInfo || matchHint || message}
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
