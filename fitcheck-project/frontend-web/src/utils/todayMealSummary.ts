import { DEFAULT_NUTRITION_GOALS, type NutritionGoals } from '../constants/nutritionGoals';
import type { MealLog } from '../types/meal';

export interface MealMacroTotals {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
}

export interface TodayMealSummary {
  totals: MealMacroTotals;
  goals: NutritionGoals;
  meals: MealLog[];
  mealKcalByType: Array<{ mealType: MealLog['mealType']; kcal: number }>;
}

export function summarizeTodayMeals(meals: MealLog[]): TodayMealSummary {
  const totals = meals.reduce<MealMacroTotals>(
    (acc, meal) => ({
      kcal: acc.kcal + (meal.macros.kcal ?? 0),
      carb: acc.carb + (meal.macros.carb ?? 0),
      protein: acc.protein + (meal.macros.protein ?? 0),
      fat: acc.fat + (meal.macros.fat ?? 0),
    }),
    { kcal: 0, carb: 0, protein: 0, fat: 0 },
  );

  const byType = new Map<MealLog['mealType'], number>();
  for (const meal of meals) {
    byType.set(
      meal.mealType,
      (byType.get(meal.mealType) ?? 0) + (meal.macros.kcal ?? 0),
    );
  }

  const mealKcalByType = [...byType.entries()].map(([mealType, kcal]) => ({
    mealType,
    kcal,
  }));

  return {
    totals,
    goals: DEFAULT_NUTRITION_GOALS,
    meals,
    mealKcalByType,
  };
}

export function macroProgress(current: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((current / goal) * 100));
}
