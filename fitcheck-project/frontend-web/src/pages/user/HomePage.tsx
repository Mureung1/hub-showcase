import { Link } from 'react-router-dom';
import './user.css';

export default function HomePage() {
  return (
    <main className="user-page">
      <header className="user-header">
        <p className="user-eyebrow">FitCheck</p>
        <h1>나만의 스마트 피트니스 가이드</h1>
        <p className="user-lead">
          비용 부담 없는 비대면 운동·식단 가이드와, 필요할 때 우리 동네 트레이너
          매칭까지.
        </p>
      </header>

      <nav className="user-nav" aria-label="회원 메뉴">
        <Link to="/user/courses" className="user-nav-card">
          <span>강좌</span>
          <strong>부위별·목적별 PT 가이드</strong>
        </Link>
        <Link to="/user/meals" className="user-nav-card">
          <span>식단</span>
          <strong>AI 식단 피드백</strong>
        </Link>
        <Link to="/user/map" className="user-nav-card">
          <span>지도</span>
          <strong>동네 헬스장 매칭</strong>
        </Link>
      </nav>

      <p className="user-footer-link">
        <Link to="/trainer">트레이너 대시보드로 이동</Link>
      </p>
    </main>
  );
}
