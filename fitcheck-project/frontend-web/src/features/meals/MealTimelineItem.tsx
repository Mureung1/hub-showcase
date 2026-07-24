import type { MealLog } from '../../types/meal';
import './meals.css';

interface MealTimelineItemProps {
  meal: MealLog;
}

export default function MealTimelineItem({ meal }: MealTimelineItemProps) {
  const title = meal.memo?.trim() || `${meal.mealType} 식단`;
  const pending = Boolean(meal.aiAnalysisPending);
  const aiEstimated =
    !pending &&
    (Boolean(meal.aiFeedback) ||
      (Boolean(meal.imageUrl) &&
        (meal.macros.kcal > 0 ||
          meal.macros.carb > 0 ||
          meal.macros.protein > 0 ||
          meal.macros.fat > 0)));

  return (
    <article className={`meal-item panel${pending ? ' meal-item--pending' : ''}`}>
      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt={title} className="meal-item-photo" />
      ) : null}

      <div className="meal-item-header">
        <div>
          <span className="meal-type-label">{meal.mealType}</span>
          {meal.time ? <span className="meal-time">{meal.time}</span> : null}
          {pending ? <span className="meal-ai-badge meal-ai-badge--pending">AI 분석 중</span> : null}
          {!pending && aiEstimated ? <span className="meal-ai-badge">AI 추정</span> : null}
          <h3>{title}</h3>
        </div>
      </div>

      <div className={`meal-macros${pending ? ' meal-macros--pending' : ''}`}>
        <div>
          <strong>{pending ? '—' : meal.macros.kcal}</strong>
          <span>kcal</span>
        </div>
        <div>
          <strong>{pending ? '—' : `${meal.macros.carb}g`}</strong>
          <span>탄수화물</span>
        </div>
        <div>
          <strong>{pending ? '—' : `${meal.macros.protein}g`}</strong>
          <span>단백질</span>
        </div>
        <div>
          <strong>{pending ? '—' : `${meal.macros.fat}g`}</strong>
          <span>지방</span>
        </div>
      </div>

      {pending ? (
        <p className="meal-feedback meal-feedback--pending">
          <span className="meal-pending-spinner" aria-hidden="true" />
          AI가 식단을 분석하고 있습니다…
        </p>
      ) : null}
      {!pending && meal.aiFeedback ? <p className="meal-feedback">{meal.aiFeedback}</p> : null}
    </article>
  );
}
