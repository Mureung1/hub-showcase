import type { MealLog } from '../../data/userMock';
import './meals.css';

interface MealTimelineItemProps {
  meal: MealLog;
}

const STATUS_CLASS = {
  good: 'badge-green',
  warn: 'badge-yellow',
  info: 'badge-purple',
} as const;

const STATUS_LABEL = {
  good: '균형',
  warn: '주의',
  info: '참고',
} as const;

export default function MealTimelineItem({ meal }: MealTimelineItemProps) {
  return (
    <article className="meal-item panel">
      <div className="meal-item-header">
        <div>
          <span className="meal-time">{meal.time}</span>
          <h3>{meal.title}</h3>
        </div>
        <span className={`status-badge ${STATUS_CLASS[meal.status]}`}>
          {STATUS_LABEL[meal.status]}
        </span>
      </div>

      <div className="meal-macros">
        <div>
          <strong>{meal.calories}</strong>
          <span>kcal</span>
        </div>
        <div>
          <strong>{meal.carbs}g</strong>
          <span>탄수화물</span>
        </div>
        <div>
          <strong>{meal.protein}g</strong>
          <span>단백질</span>
        </div>
        <div>
          <strong>{meal.fat}g</strong>
          <span>지방</span>
        </div>
      </div>

      <p className="meal-feedback">{meal.feedback}</p>
    </article>
  );
}
