import type { Meal } from '@shared/schemas';

type MealCardProps = {
  meal: Meal | null;
};

const MEAL_LABELS = [
  { key: 'breakfast' as const, label: '아침' },
  { key: 'lunch' as const, label: '점심' },
  { key: 'dinner' as const, label: '저녁' },
];

export default function MealCard({ meal }: MealCardProps) {
  if (!meal) return null;

  return (
    <section className="card">
      <h2 className="card__title">오늘의 식단</h2>
      {MEAL_LABELS.map(({ key, label }) => {
        const content = meal[key];
        if (!content) return null;
        return (
          <div key={key} className="meal-row">
            <span className="meal-row__label">{label}</span>
            <span className="meal-row__content">{content}</span>
          </div>
        );
      })}
    </section>
  );
}
