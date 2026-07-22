import { useMemo, useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import MealLogSheet, { type MealLogSheetMode } from '../../features/meals/MealLogSheet';
import MealTimelineItem from '../../features/meals/MealTimelineItem';
import { useMealTimeline } from '../../hooks/useMeals';
import { todayString } from '../../utils/date';
import '../../features/meals/meals.css';
import './user.css';

export default function MealsPage() {
  const today = todayString();
  const { meals, loading, error, refresh } = useMealTimeline();
  const [sheetMode, setSheetMode] = useState<MealLogSheetMode | null>(null);

  const todayMeals = useMemo(
    () => meals.filter((meal) => meal.date === today),
    [meals, today],
  );

  const totalCalories = todayMeals.reduce((sum, meal) => sum + (meal.macros.kcal ?? 0), 0);
  const timelineMeals = todayMeals.length > 0 ? todayMeals : meals;

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
            <strong>{todayMeals.length}</strong>
            <span>기록된 끼니</span>
          </div>
        </article>
      </section>

      <div className="meal-actions">
        <button type="button" className="btn btn-primary" onClick={() => setSheetMode('photo')}>
          <Camera size={16} />
          사진 업로드
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setSheetMode('manual')}>
          <Plus size={16} />
          칼로리 직접 입력
        </button>
      </div>

      {loading ? (
        <p className="meal-empty-state">식단을 불러오는 중…</p>
      ) : error ? (
        <p className="meal-empty-state">{error}</p>
      ) : timelineMeals.length === 0 ? (
        <p className="meal-empty-state">기록된 식단이 없습니다. 위 버튼으로 추가해 보세요.</p>
      ) : (
        <div className="meal-timeline">
          {todayMeals.length === 0 && meals.length > 0 ? (
            <p className="meal-empty-state meal-empty-state-inline">
              오늘 기록은 없습니다. 최근 식단을 표시합니다.
            </p>
          ) : null}
          {timelineMeals.map((meal) => (
            <MealTimelineItem key={meal.id} meal={meal} />
          ))}
        </div>
      )}

      {sheetMode && (
        <MealLogSheet
          open
          mode={sheetMode}
          onClose={() => setSheetMode(null)}
          onSubmitted={() => void refresh()}
        />
      )}
    </div>
  );
}
