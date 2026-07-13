import { MOCK_GYMS } from '../../data/userMock';
import GymCard from '../../features/map/GymCard';
import '../../features/map/map.css';
import './user.css';

export default function MapPage() {
  return (
    <div className="user-page">
      <header className="page-header">
        <h1>동네 헬스장 매칭</h1>
        <p>정체기가 왔을 때, 가까운 골목 헬스장·트레이너와 연결하세요.</p>
      </header>

      <div className="map-placeholder panel">
        <strong>지도 영역 (목업)</strong>
        <p>
          이후 지도 API가 여기에 연결됩니다. 지금은 반경 내 추천 리스트만
          미리보기로 제공합니다.
        </p>
      </div>

      <div className="gym-grid">
        {MOCK_GYMS.map((gym) => (
          <GymCard key={gym.id} gym={gym} />
        ))}
      </div>
    </div>
  );
}
