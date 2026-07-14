import { useMemo, useState } from 'react';
import { LocateFixed, LoaderCircle } from 'lucide-react';
import { MOCK_GYMS } from '../../data/userMock';
import ConsultRequestSheet from '../../features/map/ConsultRequestSheet';
import GymBottomSheet from '../../features/map/GymBottomSheet';
import NaverMapView from '../../features/map/NaverMapView';
import { useUserLocation } from '../../features/map/useUserLocation';
import '../../features/map/map.css';

export default function MapPage() {
  const gyms = useMemo(
    () => [...MOCK_GYMS].sort((a, b) => a.distanceKm - b.distanceKm),
    [],
  );
  const [selectedGymId, setSelectedGymId] = useState<string | null>(
    () => gyms[0]?.id ?? null,
  );
  const [consultOpen, setConsultOpen] = useState(false);
  const { location, status, message, locateToken, requestLocation } = useUserLocation();

  const selectedGym = gyms.find((gym) => gym.id === selectedGymId) ?? null;

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
        {message && (
          <p
            className={`map-locate-banner map-locate-banner-${status}`}
            role="status"
          >
            {message}
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

      <GymBottomSheet
        gyms={gyms}
        selectedGym={selectedGym}
        onSelectGym={setSelectedGymId}
        onConsult={() => setConsultOpen(true)}
      />
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
