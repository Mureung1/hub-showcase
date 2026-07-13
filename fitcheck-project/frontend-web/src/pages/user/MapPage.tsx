import { Link } from 'react-router-dom';
import './user.css';

export default function MapPage() {
  return (
    <main className="user-page">
      <Link to="/user" className="user-back">
        ← 홈
      </Link>
      <h1>동네 헬스장 매칭</h1>
      <p className="user-lead">
        지도 API 기반 골목 헬스장·트레이너 추천이 여기에 연결됩니다.
      </p>
    </main>
  );
}
