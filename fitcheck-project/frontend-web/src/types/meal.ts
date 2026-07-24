export const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export interface MealMacros {
  carb: number;
  protein: number;
  fat: number;
  kcal: number;
}

export interface MealLog {
  id: string;
  userId: string;
  date: string;
  mealType: MealType;
  time: string | null;
  memo: string | null;
  imageUrl: string | null;
  macros: MealMacros;
  aiFeedback: string | null;
  createdAt: string;
  /** Gemini 백그라운드 분석 대기 중 */
  aiAnalysisPending?: boolean;
}

export interface CreateMealPayload {
  date: string;
  mealType: MealType;
  time?: string | null;
  memo?: string | null;
  imageUrl?: string | null;
  macros?: Partial<MealMacros>;
  aiFeedback?: string | null;
}

export interface UpdateMealPayload {
  date?: string;
  mealType?: MealType;
  time?: string | null;
  memo?: string | null;
  imageUrl?: string | null;
  macros?: Partial<MealMacros>;
  aiFeedback?: string | null;
}
