import { useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import MealLogSheet, { type MealLogSheetMode } from '../../features/meals/MealLogSheet';
import MealTimelineItem from '../../features/meals/MealTimelineItem';
import { useMeals } from '../../hooks/useMeals';
import { todayString } from '../../utils/date';
import '../../features/meals/meals.css';
import './user.css';

export default function MealsPage() {
  const today = todayString();
  const { meals, loading, error, refresh } = useMeals(today);
  const [sheetMode, setSheetMode] = useState<MealLogSheetMode | null>(null);

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.macros.kcal ?? 0), 0);

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
            <strong>{meals.length}</strong>
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
      ) : meals.length === 0 ? (
        <p className="meal-empty-state">오늘 기록된 식단이 없습니다. 위 버튼으로 추가해 보세요.</p>
      ) : (
        <div className="meal-timeline">
          {meals.map((meal) => (
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
