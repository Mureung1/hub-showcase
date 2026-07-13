import { Camera, Plus } from 'lucide-react';
import { MOCK_MEALS } from '../../data/userMock';
import MealTimelineItem from '../../features/meals/MealTimelineItem';
import '../../features/meals/meals.css';
import './user.css';

export default function MealsPage() {
  const totalCalories = MOCK_MEALS.reduce((sum, meal) => sum + meal.calories, 0);

  return (
    <div className="user-page">
      <header className="page-header">
        <h1>AI 식단 피드백</h1>
        <p>기록만 하면 탄단지 비율과 가이드가 타임라인으로 쌓입니다.</p>
      </header>

      <section className="user-stats user-stats-compact" aria-label="오늘 식단 요약">
        <article className="stat-card">
          <span className="stat-dot stat-dot-red" />
          <div>
            <strong>{totalCalories}</strong>
            <span>오늘 총 칼로리</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-dot stat-dot-green" />
          <div>
            <strong>{MOCK_MEALS.length}</strong>
            <span>기록된 끼니</span>
          </div>
        </article>
      </section>

      <div className="meal-actions">
        <button type="button" className="btn btn-primary">
          <Camera size={16} />
          사진 업로드
        </button>
        <button type="button" className="btn btn-secondary">
          <Plus size={16} />
          칼로리 직접 입력
        </button>
      </div>

      <div className="meal-timeline">
        {MOCK_MEALS.map((meal) => (
          <MealTimelineItem key={meal.id} meal={meal} />
        ))}
      </div>
    </div>
  );
}
