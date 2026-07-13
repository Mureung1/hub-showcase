import type { Exercise, WorkoutRecord } from '../types';
import { getDaysSince } from './date';
import { generateId } from './routine';
import { getMemberWorkouts } from './growth';

export type RecommendationTrend =
  | 'progressing'
  | 'plateau'
  | 'comeback'
  | 'maintain';

export interface RecommendationChange {
  exerciseName: string;
  label: string;
}

export interface RoutineRecommendation {
  headline: string;
  analysis: string;
  suggestedExercises: Exercise[];
  changes: RecommendationChange[];
  trend: RecommendationTrend;
}

function cloneExercises(exercises: Exercise[]): Exercise[] {
  return exercises.map((ex) => ({ ...ex, id: generateId() }));
}

function getMainWeightTrend(workouts: WorkoutRecord[]): number[] {
  return workouts.map((w) => w.exercises[0]?.weight ?? 0);
}

export function buildChanges(
  before: Exercise[],
  after: Exercise[],
): RecommendationChange[] {
  const changes: RecommendationChange[] = [];
  after.forEach((ex, i) => {
    const prev = before[i];
    if (!prev || prev.name !== ex.name) return;
    const parts: string[] = [];
    if (ex.weight !== prev.weight) {
      parts.push(`${prev.weight}kg → ${ex.weight}kg`);
    }
    if (ex.sets !== prev.sets) {
      parts.push(`${prev.sets}세트 → ${ex.sets}세트`);
    }
    if (ex.reps !== prev.reps) {
      parts.push(`${prev.reps}회 → ${ex.reps}회`);
    }
    if (parts.length > 0) {
      changes.push({ exerciseName: ex.name, label: parts.join(', ') });
    }
  });
  return changes;
}

export interface RoutineRecommendationResult extends RoutineRecommendation {
  source: 'ai' | 'rules';
}

export function buildRecommendationFromExercises(
  headline: string,
  analysis: string,
  trend: RecommendationTrend,
  suggested: Exercise[],
  baseExercises: Exercise[],
): RoutineRecommendation {
  const suggestedExercises = suggested.map((ex) => ({
    ...ex,
    id: ex.id || generateId(),
  }));
  return {
    headline,
    analysis,
    trend,
    suggestedExercises,
    changes: buildChanges(baseExercises, suggestedExercises),
  };
}

export function generateRoutineRecommendation(
  memberName: string,
  memberGoal: string,
  workoutHistory: WorkoutRecord[],
  memberId: string,
  currentRoutine: Exercise[],
): RoutineRecommendation | null {
  const workouts = getMemberWorkouts(memberId, workoutHistory);
  const baseExercises =
    workouts.length > 0
      ? workouts[workouts.length - 1]!.exercises
      : currentRoutine;

  if (baseExercises.length === 0) return null;

  const lastWorkout = workouts[workouts.length - 1];
  const daysSinceLast = lastWorkout
    ? getDaysSince(lastWorkout.date)
    : 999;
  const mainName = baseExercises[0]!.name;
  const weights = getMainWeightTrend(workouts);
  const mainExercise = baseExercises[0]!;

  let trend: RecommendationTrend = 'maintain';
  let suggested = cloneExercises(baseExercises);
  let analysis = '';

  if (daysSinceLast >= 14) {
    trend = 'comeback';
    analysis = `${memberName} 회원은 ${daysSinceLast}일 만에 복귀 예정이에요. 부상 방지를 위해 지난 세션과 동일한 강도로 시작하는 것을 추천드려요.`;
  } else if (weights.length >= 3) {
    const recent = weights.slice(-3);
    const allSame = recent.every((w) => w === recent[0]);
    const increasing = recent[2]! >= recent[1]! && recent[1]! >= recent[0]!;

    if (allSame && recent[0]! > 0) {
      trend = 'plateau';
      suggested = suggested.map((ex, i) => {
        if (i === 0) return { ...ex, sets: ex.sets + 1, reps: ex.reps + 2 };
        return { ...ex, sets: ex.sets + 1 };
      });
      analysis = `${memberName} 회원의 ${mainName} ${recent[0]}kg이 3세션 이상 정체됐어요. 중량은 유지하고 세트·횟수를 올려 돌파를 시도해보세요.`;
    } else if (increasing) {
      trend = 'progressing';
      suggested = suggested.map((ex, i) => {
        if (i === 0 && ex.weight > 0) {
          return { ...ex, weight: Math.round((ex.weight + 2.5) * 10) / 10 };
        }
        if (i > 0) return { ...ex, sets: ex.sets + 1 };
        return ex;
      });
      const start = weights[0]!;
      const end = weights[weights.length - 1]!;
      analysis = `${memberName} 회원은 최근 ${workouts.length}세션 동안 ${mainName} ${start}→${end}kg으로 꾸준히 성장 중이에요. 이번엔 메인 +2.5kg, 보조 운동 +1세트를 추천드려요.`;
    } else {
      trend = 'maintain';
      suggested = suggested.map((ex, i) => {
        if (i === 0 && ex.weight > 0) {
          return { ...ex, weight: Math.round((ex.weight + 2.5) * 10) / 10 };
        }
        return ex;
      });
      analysis = `${memberName} 회원의 수행 기록을 바탕으로, 메인 운동 ${mainName}에 +2.5kg 점진적 과부하를 적용해보세요.`;
    }
  } else if (weights.length >= 1) {
    trend = 'progressing';
    suggested = suggested.map((ex, i) => {
      if (i === 0 && ex.weight > 0) {
        return { ...ex, weight: Math.round((ex.weight + 2.5) * 10) / 10 };
      }
      if (i > 0) return { ...ex, sets: ex.sets + 1 };
      return ex;
    });
    analysis = `${memberName} 회원의 최근 ${mainName} ${mainExercise.weight}kg 기록을 바탕으로, 이번 세션 과부하를 추천드려요.`;
  } else {
    trend = 'maintain';
    suggested = suggested.map((ex, i) => {
      if (i === 0 && ex.weight > 0) {
        return { ...ex, weight: Math.round((ex.weight + 2.5) * 10) / 10 };
      }
      return ex;
    });
    analysis = `등록된 루틴을 바탕으로 ${mainName} +2.5kg 적용을 추천드려요.`;
  }

  if (memberGoal) {
    analysis += ` (목표: ${memberGoal})`;
  }

  const headline =
    trend === 'comeback'
      ? '복귀 세션, 이렇게 시작해보는 건 어때요?'
      : trend === 'plateau'
        ? '정체 구간, 이렇게 돌파해보는 건 어때요?'
        : '기록 기반, 이번 세션 이렇게 가볼까요?';

  return buildRecommendationFromExercises(
    headline,
    analysis,
    trend,
    suggested,
    baseExercises,
  );
}
