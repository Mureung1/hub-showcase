import { Link } from 'react-router-dom';
import './user.css';

export default function CoursesPage() {
  return (
    <main className="user-page">
      <Link to="/user" className="user-back">
        ← 홈
      </Link>
      <h1>맞춤 PT 강좌</h1>
      <p className="user-lead">
        부위별·목적별 가이드 영상 기능이 여기에 연결됩니다.
      </p>
    </main>
  );
}
