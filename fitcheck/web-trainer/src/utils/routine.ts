import type { Exercise, MacroType } from '../types';

export function formatExerciseLine(ex: Exercise): string {
  return `${ex.name} — ${ex.weight}kg × ${ex.sets}세트 × ${ex.reps}회`;
}

export function formatRoutineText(memberName: string, exercises: Exercise[]): string {
  const lines = exercises.map((ex, i) => `${i + 1}. ${formatExerciseLine(ex)}`);
  return `📋 오늘의 루틴 — ${memberName}\n\n${lines.join('\n')}`;
}

export function applyMacro(exercises: Exercise[], macro: MacroType): Exercise[] {
  return exercises.map((ex) => {
    switch (macro) {
      case '+2.5kg':
        return { ...ex, weight: Math.round((ex.weight + 2.5) * 10) / 10 };
      case '+1세트':
        return { ...ex, sets: ex.sets + 1 };
      case '+2 reps':
        return { ...ex, reps: ex.reps + 2 };
    }
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
