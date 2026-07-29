import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import MealLogSheet, { type MealLogSheetMode } from '../../features/meals/MealLogSheet';
import MealTimelineItem from '../../features/meals/MealTimelineItem';
import { useMealTimeline } from '../../hooks/useMeals';
import { todayString } from '../../utils/date';
import '../../features/meals/meals.css';
import './user.css';

type DateFilter = 'today' | 'yesterday' | 'week';

function yesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function weekStartString() {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
}

export default function MealsPage() {
  const today = todayString();
  const yesterday = yesterdayString();
  const weekStart = weekStartString();
  const { meals, loading, error, refresh } = useMealTimeline();
  const [sheetMode, setSheetMode] = useState<MealLogSheetMode | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const filteredMeals = useMemo(() => {
    if (dateFilter === 'today') {
      return meals.filter((meal) => meal.date === today);
    }
    if (dateFilter === 'yesterday') {
      return meals.filter((meal) => meal.date === yesterday);
    }
    return meals.filter((meal) => meal.date >= weekStart);
  }, [meals, dateFilter, today, yesterday, weekStart]);

  const totalCalories = filteredMeals.reduce((sum, meal) => sum + (meal.macros.kcal ?? 0), 0);

  return (
    <div className="user-page meals-page">
      <header className="page-header">
        <h1>식단 기록</h1>
        <p>AI가 분석한 오늘의 식단 피드백</p>
      </header>

      <div className="meal-date-filters" role="tablist" aria-label="기간 필터">
        {(
          [
            ['today', '오늘'],
            ['yesterday', '어제'],
            ['week', '이번 주'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={dateFilter === key}
            className={`meal-date-filter${dateFilter === key ? ' active' : ''}`}
            onClick={() => setDateFilter(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className="user-stats user-stats-compact" aria-label="식단 요약">
        <article className="stat-card">
          <span className="stat-dot stat-dot-red" />
          <div>
            <strong>{totalCalories.toLocaleString()}</strong>
            <span>총 칼로리</span>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-dot stat-dot-green" />
          <div>
            <strong>{filteredMeals.length}</strong>
            <span>기록된 끼니</span>
          </div>
        </article>
      </section>

      {loading ? (
        <p className="meal-empty-state">식단을 불러오는 중…</p>
      ) : error ? (
        <p className="meal-empty-state">{error}</p>
      ) : filteredMeals.length === 0 ? (
        <p className="meal-empty-state">기록된 식단이 없습니다. 아래 버튼으로 추가해 보세요.</p>
      ) : (
        <div className="meal-timeline">
          {filteredMeals.map((meal) => (
            <MealTimelineItem key={meal.id} meal={meal} />
          ))}
        </div>
      )}

      <div className="meal-sticky-cta">
        <button type="button" className="btn btn-primary" onClick={() => setSheetMode('photo')}>
          <Plus size={18} />
          식사 기록하기
        </button>
      </div>

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
