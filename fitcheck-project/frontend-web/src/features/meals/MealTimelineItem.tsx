import type { MealLog } from '../../types/meal';
import './meals.css';

interface MealTimelineItemProps {
  meal: MealLog;
}

export default function MealTimelineItem({ meal }: MealTimelineItemProps) {
  const title = meal.memo?.trim() || `${meal.mealType} 식단`;

  return (
    <article className="meal-item panel">
      {meal.imageUrl ? (
        <img src={meal.imageUrl} alt={title} className="meal-item-photo" />
      ) : null}

      <div className="meal-item-header">
        <div>
          <span className="meal-type-label">{meal.mealType}</span>
          {meal.time ? <span className="meal-time">{meal.time}</span> : null}
          <h3>{title}</h3>
        </div>
      </div>

      <div className="meal-macros">
        <div>
          <strong>{meal.macros.kcal}</strong>
          <span>kcal</span>
        </div>
        <div>
          <strong>{meal.macros.carb}g</strong>
          <span>탄수화물</span>
        </div>
        <div>
          <strong>{meal.macros.protein}g</strong>
          <span>단백질</span>
        </div>
        <div>
          <strong>{meal.macros.fat}g</strong>
          <span>지방</span>
        </div>
      </div>

      {meal.aiFeedback ? <p className="meal-feedback">{meal.aiFeedback}</p> : null}
    </article>
  );
}
