import { Link } from 'react-router-dom';
import './user.css';

export default function MealsPage() {
  return (
    <main className="user-page">
      <Link to="/user" className="user-back">
        ← 홈
      </Link>
      <h1>AI 식단 피드백</h1>
      <p className="user-lead">
        식단 기록과 탄단지 분석 타임라인이 여기에 연결됩니다.
      </p>
    </main>
  );
}
