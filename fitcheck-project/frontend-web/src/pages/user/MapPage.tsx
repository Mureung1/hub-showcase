import { MOCK_GYMS } from '../../data/userMock';
import GymCard from '../../features/map/GymCard';
import NaverMapView from '../../features/map/NaverMapView';
import '../../features/map/map.css';
import './user.css';

export default function MapPage() {
  return (
    <div className="user-page map-page">
      <header className="page-header">
        <h1>동네 헬스장 매칭</h1>
        <p>정체기가 왔을 때, 가까운 골목 헬스장·트레이너와 연결하세요.</p>
      </header>

      <section className="map-section" aria-label="주변 지도">
        <NaverMapView gyms={MOCK_GYMS} />
      </section>

      <section className="user-section" aria-label="추천 헬스장 목록">
        <h2 className="map-list-title">주변 추천 {MOCK_GYMS.length}곳</h2>
        <div className="gym-grid">
          {MOCK_GYMS.map((gym) => (
            <GymCard key={gym.id} gym={gym} />
          ))}
        </div>
      </section>
    </div>
  );
}
