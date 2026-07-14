import { useMemo, useState } from 'react';
import { MOCK_GYMS } from '../../data/userMock';
import GymBottomSheet from '../../features/map/GymBottomSheet';
import NaverMapView from '../../features/map/NaverMapView';
import '../../features/map/map.css';

export default function MapPage() {
  const gyms = useMemo(
    () => [...MOCK_GYMS].sort((a, b) => a.distanceKm - b.distanceKm),
    [],
  );
  const [selectedGymId, setSelectedGymId] = useState<string | null>(
    () => gyms[0]?.id ?? null,
  );

  const selectedGym = gyms.find((gym) => gym.id === selectedGymId) ?? null;

  return (
    <div className="map-page">
      <NaverMapView
        gyms={gyms}
        selectedGymId={selectedGymId}
        onSelectGym={setSelectedGymId}
      />
      <GymBottomSheet
        gyms={gyms}
        selectedGym={selectedGym}
        onSelectGym={setSelectedGymId}
      />
    </div>
  );
}
