import type { AppData, MealEntry, Member, WorkoutRecord } from '../types';
import { createSeedData, getMealPhotoUrl } from './seed';

const STORAGE_KEY = 'fitcheck-trainer-data';

function withMemberDefaults(members: Member[] | undefined, seed: AppData): Member[] {
  const source = members && members.length > 0 ? members : seed.members;
  return source.map((member) => {
    const seedMember = seed.members.find((item) => item.id === member.id);
    return {
      ...member,
      calorieGoal: member.calorieGoal ?? seedMember?.calorieGoal ?? 2200,
    };
  });
}

function withMealDefaults(meals: MealEntry[] | undefined, seed: AppData): MealEntry[] {
  if (!meals || meals.length === 0) return seed.meals;

  const hasNutrition = meals.some(
    (meal) => typeof meal.calories === 'number' && meal.calories > 0,
  );
  if (!hasNutrition) return seed.meals;

  return meals.map((meal) => ({
    ...meal,
    calories: meal.calories ?? 0,
    carbs: meal.carbs ?? 0,
    protein: meal.protein ?? 0,
    fat: meal.fat ?? 0,
    photoUrl: meal.photoUrl ?? getMealPhotoUrl(meal.mealType, meal.id),
  }));
}

function withWorkoutDefaults(
  workouts: WorkoutRecord[] | undefined,
  seed: AppData,
): WorkoutRecord[] {
  if (!workouts || workouts.length === 0) return seed.workoutHistory;
  // Prefer denser seed history when stored data is the older weekly-only set.
  if (workouts.length < seed.workoutHistory.length * 0.6) {
    return seed.workoutHistory;
  }
  return workouts.map((workout) => ({
    ...workout,
    time: workout.time ?? '18:00',
  }));
}

export function loadData(): AppData {
  const seed = createSeedData();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppData>;
      return {
        ...seed,
        ...parsed,
        members: withMemberDefaults(parsed.members, seed),
        meals: withMealDefaults(parsed.meals, seed),
        workoutHistory: withWorkoutDefaults(parsed.workoutHistory, seed),
      };
    }
  } catch {
    // corrupted data — fall through to seed
  }
  return seed;
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
