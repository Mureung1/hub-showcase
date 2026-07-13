import type { MealEntry, WorkoutRecord } from '../types';
import { todayString } from './date';

export interface GrowthSummary {
  totalSessions: number;
  mealCompliance: number;
  prWeight: number;
  prExercise: string;
  weekChange: number;
  totalVolume: number;
}

export interface OverloadChartPoint {
  date: string;
  label: string;
  weight: number;
  volume: number;
  exercise: string;
}

export interface MealWeekPoint {
  week: string;
  count: number;
  target: number;
}

export interface Milestone {
  id: string;
  date: string;
  text: string;
  type: 'pr' | 'streak' | 'volume';
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  return `${d.getMonth() + 1}/${d.getDate()}~`;
}

export function getMemberWorkouts(
  memberId: string,
  history: WorkoutRecord[],
): WorkoutRecord[] {
  return history
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getOverloadChartData(
  workouts: WorkoutRecord[],
): OverloadChartPoint[] {
  return workouts.map((record) => {
    const main = record.exercises[0];
    const volume = record.exercises.reduce(
      (sum, ex) => sum + ex.weight * ex.sets * ex.reps,
      0,
    );
    return {
      date: record.date,
      label: formatShortDate(record.date),
      weight: main?.weight ?? 0,
      volume: Math.round(volume),
      exercise: main?.name ?? '-',
    };
  });
}

export function getGrowthSummary(
  memberId: string,
  workouts: WorkoutRecord[],
  meals: MealEntry[],
): GrowthSummary {
  const memberWorkouts = getMemberWorkouts(memberId, workouts);
  const memberMeals = meals.filter((m) => m.memberId === memberId);

  const totalSessions = memberWorkouts.length;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const fourWeeksAgoStr = fourWeeksAgo.toISOString().split('T')[0]!;
  const recentMeals = memberMeals.filter((m) => m.date >= fourWeeksAgoStr);
  const expectedMeals = 28;
  const mealCompliance = Math.min(
    100,
    Math.round((recentMeals.length / expectedMeals) * 100),
  );

  let prWeight = 0;
  let prExercise = '-';
  for (const record of memberWorkouts) {
    const main = record.exercises[0];
    if (main && main.weight > prWeight) {
      prWeight = main.weight;
      prExercise = main.name;
    }
  }

  const chartData = getOverloadChartData(memberWorkouts);
  const weekChange =
    chartData.length >= 2
      ? chartData[chartData.length - 1]!.weight -
        chartData[chartData.length - 2]!.weight
      : 0;

  const latest = memberWorkouts[memberWorkouts.length - 1];
  const totalVolume = latest
    ? latest.exercises.reduce(
        (sum, ex) => sum + ex.weight * ex.sets * ex.reps,
        0,
      )
    : 0;

  return {
    totalSessions,
    mealCompliance,
    prWeight,
    prExercise,
    weekChange,
    totalVolume: Math.round(totalVolume),
  };
}

export function getMealWeeklyData(
  memberId: string,
  meals: MealEntry[],
  weeks = 4,
): MealWeekPoint[] {
  const memberMeals = meals.filter((m) => m.memberId === memberId);
  const today = todayString();
  const points: MealWeekPoint[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const startStr = weekStart.toISOString().split('T')[0]!;
    const endStr = weekEnd.toISOString().split('T')[0]!;

    const count = memberMeals.filter(
      (m) => m.date >= startStr && m.date <= endStr,
    ).length;

    points.push({
      week: getWeekLabel(startStr),
      count,
      target: 7,
    });
  }

  return points;
}

export function getMilestones(
  memberId: string,
  workouts: WorkoutRecord[],
  meals: MealEntry[],
): Milestone[] {
  const milestones: Milestone[] = [];
  const memberWorkouts = getMemberWorkouts(memberId, workouts);
  const memberMeals = meals
    .filter((m) => m.memberId === memberId)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (memberWorkouts.length === 0) return milestones;

  const chartData = getOverloadChartData(memberWorkouts);
  const latest = chartData[chartData.length - 1]!;
  const first = chartData[0]!;

  if (latest.weight > first.weight) {
    milestones.push({
      id: 'pr-latest',
      date: latest.date,
      text: `${latest.exercise} ${latest.weight}kg 달성 (시작 ${first.weight}kg → +${latest.weight - first.weight}kg)`,
      type: 'pr',
    });
  }

  let streak = 0;
  const mealDates = new Set(memberMeals.map((m) => m.date));
  const today = new Date();
  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0]!;
    if (mealDates.has(dateStr)) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  if (streak >= 3) {
    milestones.push({
      id: 'meal-streak',
      date: todayString(),
      text: `${streak}일 연속 식단 업로드 중`,
      type: 'streak',
    });
  }

  if (memberWorkouts.length >= 8) {
    milestones.push({
      id: 'session-8',
      date: latest.date,
      text: `8주 프로그램 ${memberWorkouts.length}세션 완료`,
      type: 'volume',
    });
  }

  const maxVolume = Math.max(...chartData.map((p) => p.volume));
  const maxVolPoint = chartData.find((p) => p.volume === maxVolume);
  if (maxVolPoint && maxVolume > 0) {
    milestones.push({
      id: 'max-volume',
      date: maxVolPoint.date,
      text: `최대 볼륨 ${maxVolume.toLocaleString()}kg·reps 기록`,
      type: 'volume',
    });
  }

  return milestones.slice(0, 5);
}

export function getExerciseOptions(
  workouts: WorkoutRecord[],
): { index: number; name: string }[] {
  const latest = workouts[workouts.length - 1];
  if (!latest) return [];
  return latest.exercises.map((ex, index) => ({
    index,
    name: ex.name,
  }));
}

export function getOverloadChartDataForExercise(
  workouts: WorkoutRecord[],
  exerciseIndex: number,
): OverloadChartPoint[] {
  return workouts.map((record) => {
    const ex = record.exercises[exerciseIndex];
    const volume = record.exercises.reduce(
      (sum, e) => sum + e.weight * e.sets * e.reps,
      0,
    );
    return {
      date: record.date,
      label: formatShortDate(record.date),
      weight: ex?.weight ?? 0,
      volume: Math.round(volume),
      exercise: ex?.name ?? '-',
    };
  });
}
