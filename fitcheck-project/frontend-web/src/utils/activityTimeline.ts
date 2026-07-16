import type { MealEntry, WorkoutRecord } from '../types';
import { formatExerciseLine } from './routine';
import type { NutritionPeriod } from './nutrition';
import { daysAgo, todayString } from './date';

export type ActivityKind = 'meal' | 'workout';

export interface ActivityMealItem {
  kind: 'meal';
  id: string;
  date: string;
  time: string;
  meal: MealEntry;
}

export interface ActivityWorkoutItem {
  kind: 'workout';
  id: string;
  date: string;
  time: string;
  workout: WorkoutRecord;
  summaryLines: string[];
}

export type ActivityItem = ActivityMealItem | ActivityWorkoutItem;

export interface ActivityDayGroup {
  date: string;
  items: ActivityItem[];
}

function inPeriod(date: string, period: NutritionPeriod): boolean {
  const start = daysAgo(period - 1);
  const end = todayString();
  return date >= start && date <= end;
}

export function buildActivityTimeline(
  memberId: string,
  meals: MealEntry[],
  workouts: WorkoutRecord[],
  period: NutritionPeriod,
): ActivityDayGroup[] {
  const mealItems: ActivityItem[] = meals
    .filter((meal) => meal.memberId === memberId && inPeriod(meal.date, period))
    .map((meal) => ({
      kind: 'meal' as const,
      id: meal.id,
      date: meal.date,
      time: meal.time,
      meal,
    }));

  const workoutItems: ActivityItem[] = workouts
    .filter(
      (workout) => workout.memberId === memberId && inPeriod(workout.date, period),
    )
    .map((workout) => ({
      kind: 'workout' as const,
      id: workout.id,
      date: workout.date,
      time: workout.time ?? '18:00',
      workout,
      summaryLines: workout.exercises.map((exercise) => formatExerciseLine(exercise)),
    }));

  const grouped = new Map<string, ActivityItem[]>();
  for (const item of [...mealItems, ...workoutItems]) {
    const bucket = grouped.get(item.date) ?? [];
    bucket.push(item);
    grouped.set(item.date, bucket);
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => a.time.localeCompare(b.time)),
    }));
}
