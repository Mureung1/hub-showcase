import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { GymPlace } from '../../../data/userMock';
import GymThumbnail from '../../../features/map/GymThumbnail';

interface HomeGymMatchCardProps {
  gym: GymPlace | null;
  totalNearby: number;
  loading: boolean;
}

export default function HomeGymMatchCard({
  gym,
  totalNearby,
  loading,
}: HomeGymMatchCardProps) {
  return (
    <section className="showcase-card home-gym-card">
      <div className="home-diet-header">
        <h2 className="showcase-section-title">근처 매칭</h2>
        <Link to="/user/map" className="home-section-link">
          {totalNearby}곳 보기
        </Link>
      </div>

      {loading && <p className="home-empty-copy">주변 헬스장을 불러오는 중...</p>}

      {!loading && gym && (
        <div className="home-gym-match">
          <GymThumbnail gym={gym} size="sm" />
          <div className="home-gym-match-body">
            <div className="home-gym-match-top">
              <strong>{gym.name}</strong>
              {gym.matchScore !== undefined && gym.matchScore > 0 && (
                <span className="gym-match-badge">매칭 {gym.matchScore}점</span>
              )}
            </div>
            <p className="home-gym-match-meta">
              <MapPin size={14} />
              {gym.distanceKm.toFixed(1)}km · {gym.type}
            </p>
            {gym.matchReasons?.[0] && (
              <p className="home-gym-match-reason">{gym.matchReasons[0]}</p>
            )}
            <Link to={`/user/gym/${gym.id}`} className="btn btn-ghost home-gym-cta">
              상세보기
            </Link>
          </div>
        </div>
      )}

      {!loading && !gym && (
        <p className="home-empty-copy">주변 헬스장을 찾지 못했습니다.</p>
      )}
    </section>
  );
}
