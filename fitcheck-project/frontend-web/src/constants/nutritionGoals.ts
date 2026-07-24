/**
 * 일일 영양 목표 (mock).
 * TODO: 프로필 API 연동 후 user profile에서 goal 값을 불러오도록 교체.
 */
export interface NutritionGoals {
  kcal: number;
  carb: number;
  protein: number;
  fat: number;
}

export const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  kcal: 2300,
  carb: 250,
  protein: 120,
  fat: 70,
};
