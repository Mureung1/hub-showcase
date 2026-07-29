import type { MealEntry, Member } from '../types';
import { daysAgo, todayString } from './date';

export type NutritionPeriod = 7 | 30;

export interface CalorieTrendPoint {
  date: string;
  label: string;
  actual: number;
  goal: number;
}

export interface MacroSharePoint {
  name: string;
  value: number;
  grams: number;
  color: string;
}

export const MACRO_COLORS = {
  carbs: '#f5a524',
  protein: '#ff6b4a',
  fat: '#34c759',
} as const;

function dateKey(daysBack: number): string {
  return daysAgo(daysBack);
}

function shortLabel(dateStr: string, period: NutritionPeriod): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (period === 7) {
    return date.toLocaleDateString('ko-KR', { weekday: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export function getMealsInPeriod(
  meals: MealEntry[],
  memberId: string,
  period: NutritionPeriod,
): MealEntry[] {
  const start = dateKey(period - 1);
  return meals.filter(
    (meal) =>
      meal.memberId === memberId &&
      meal.date >= start &&
      meal.date <= todayString(),
  );
}

export function getCalorieTrendData(
  meals: MealEntry[],
  member: Member,
  period: NutritionPeriod,
): CalorieTrendPoint[] {
  const memberMeals = getMealsInPeriod(meals, member.id, period);
  const byDate = new Map<string, number>();

  for (const meal of memberMeals) {
    byDate.set(meal.date, (byDate.get(meal.date) ?? 0) + (meal.calories ?? 0));
  }

  const points: CalorieTrendPoint[] = [];
  for (let i = period - 1; i >= 0; i -= 1) {
    const date = dateKey(i);
    points.push({
      date,
      label: shortLabel(date, period),
      actual: byDate.get(date) ?? 0,
      goal: member.calorieGoal,
    });
  }
  return points;
}

export function getMacroShareData(
  meals: MealEntry[],
  memberId: string,
  period: NutritionPeriod,
): MacroSharePoint[] {
  const memberMeals = getMealsInPeriod(meals, memberId, period);
  const totals = memberMeals.reduce(
    (acc, meal) => ({
      carbs: acc.carbs + (meal.carbs ?? 0),
      protein: acc.protein + (meal.protein ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
    }),
    { carbs: 0, protein: 0, fat: 0 },
  );

  return [
    {
      name: '탄수화물',
      value: totals.carbs,
      grams: Math.round(totals.carbs),
      color: MACRO_COLORS.carbs,
    },
    {
      name: '단백질',
      value: totals.protein,
      grams: Math.round(totals.protein),
      color: MACRO_COLORS.protein,
    },
    {
      name: '지방',
      value: totals.fat,
      grams: Math.round(totals.fat),
      color: MACRO_COLORS.fat,
    },
  ].filter((item) => item.value > 0);
}

export function getNutritionSummary(
  meals: MealEntry[],
  member: Member,
  period: NutritionPeriod,
) {
  const trend = getCalorieTrendData(meals, member, period);
  const loggedDays = trend.filter((point) => point.actual > 0).length;
  const avgActual =
    loggedDays === 0
      ? 0
      : Math.round(
          trend.reduce((sum, point) => sum + point.actual, 0) / loggedDays,
        );
  const goalDiff = avgActual - member.calorieGoal;

  return {
    loggedDays,
    avgActual,
    goal: member.calorieGoal,
    goalDiff,
  };
}
