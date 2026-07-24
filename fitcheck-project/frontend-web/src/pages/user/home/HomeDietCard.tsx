import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { TodayMealSummary } from '../../../utils/todayMealSummary';
import { macroProgress } from '../../../utils/todayMealSummary';

interface HomeDietCardProps {
  summary: TodayMealSummary | null;
  isAuthenticated: boolean;
}

function CalorieRing({ current, goal }: { current: number; goal: number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const ratio = goal > 0 ? Math.min(1, current / goal) : 0;
  const offset = circumference * (1 - ratio);

  return (
    <div className="home-calorie-ring" aria-hidden="true">
      <svg viewBox="0 0 120 120" className="home-calorie-ring-svg">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="home-calorie-ring-label">
        <strong>{current.toLocaleString()}</strong>
        <span>/ {goal.toLocaleString()} kcal</span>
      </div>
    </div>
  );
}

function MacroBar({
  label,
  current,
  goal,
  color,
}: {
  label: string;
  current: number;
  goal: number;
  color: string;
}) {
  const pct = macroProgress(current, goal);
  return (
    <div className="home-macro-row">
      <div className="home-macro-row-top">
        <span>{label}</span>
        <span>
          {Math.round(current)}g / {goal}g
        </span>
      </div>
      <div className="home-macro-track">
        <span
          className="home-macro-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function HomeDietCard({ summary, isAuthenticated }: HomeDietCardProps) {
  if (!isAuthenticated) {
    return (
      <section className="showcase-card home-diet-card">
        <h2 className="showcase-section-title">오늘 식단 기록</h2>
        <p className="home-empty-copy">
          로그인 후 식단을 기록하면 칼로리·탄단지 요약이 여기에 표시됩니다.
        </p>
        <Link to="/login" className="btn btn-primary home-diet-cta">
          로그인하기
        </Link>
      </section>
    );
  }

  const totals = summary?.totals ?? { kcal: 0, carb: 0, protein: 0, fat: 0 };
  const goals = summary?.goals;
  const meals = summary?.meals ?? [];

  return (
    <section className="showcase-card home-diet-card">
      <div className="home-diet-header">
        <h2 className="showcase-section-title">오늘 식단 기록</h2>
        <Link to="/user/meals" className="home-section-link">
          기록하기
        </Link>
      </div>

      <div className="home-diet-body">
        <CalorieRing current={totals.kcal} goal={goals?.kcal ?? 2300} />

        <div className="home-diet-details">
          {meals.length === 0 ? (
            <p className="home-empty-copy">오늘 아직 기록된 식단이 없습니다.</p>
          ) : (
            <ul className="home-meal-kcal-list">
              {summary?.mealKcalByType.map((item) => (
                <li key={item.mealType}>
                  <Check size={14} aria-hidden="true" />
                  <span>{item.mealType}</span>
                  <strong>{item.kcal} kcal</strong>
                </li>
              ))}
            </ul>
          )}

          <div className="home-macro-bars">
            <MacroBar
              label="탄수화물"
              current={totals.carb}
              goal={goals?.carb ?? 250}
              color="#f5a524"
            />
            <MacroBar
              label="단백질"
              current={totals.protein}
              goal={goals?.protein ?? 120}
              color="var(--accent)"
            />
            <MacroBar
              label="지방"
              current={totals.fat}
              goal={goals?.fat ?? 70}
              color="#34c759"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
