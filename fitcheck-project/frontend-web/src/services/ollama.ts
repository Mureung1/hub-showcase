import type { Exercise, WorkoutRecord } from '../types';
import {
  buildRecommendationFromExercises,
  generateRoutineRecommendation,
  type RecommendationTrend,
  type RoutineRecommendationResult,
} from '../utils/recommendation';
import { getMemberWorkouts } from '../utils/growth';
import { generateId } from '../utils/routine';

const OLLAMA_BASE = import.meta.env.VITE_OLLAMA_URL ?? '/ollama';
const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL ?? 'llama3.2';
const REQUEST_TIMEOUT_MS = 45_000;

interface OllamaExerciseJson {
  name: string;
  weight: number;
  sets: number;
  reps: number;
}

interface OllamaResponseJson {
  headline: string;
  analysis: string;
  trend: RecommendationTrend;
  exercises: OllamaExerciseJson[];
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer),
  );
}

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${OLLAMA_BASE}/api/tags`, {}, 3000);
    return res.ok;
  } catch {
    return false;
  }
}

function formatWorkoutHistory(workouts: WorkoutRecord[]): string {
  if (workouts.length === 0) return '운동 기록 없음';
  return workouts
    .map((w) => {
      const lines = w.exercises.map(
        (ex) => `  - ${ex.name}: ${ex.weight}kg × ${ex.sets}세트 × ${ex.reps}회`,
      );
      return `[${w.date}]\n${lines.join('\n')}`;
    })
    .join('\n\n');
}

function formatCurrentRoutine(routine: Exercise[]): string {
  if (routine.length === 0) return '등록된 루틴 없음';
  return routine
    .map(
      (ex) =>
        `- ${ex.name}: ${ex.weight}kg × ${ex.sets}세트 × ${ex.reps}회`,
    )
    .join('\n');
}

function buildPrompt(
  memberName: string,
  memberGoal: string,
  workouts: WorkoutRecord[],
  currentRoutine: Exercise[],
): string {
  return `당신은 전문 피트니스 트레이너 AI입니다. 회원의 운동 기록을 분석하고 다음 세션 루틴을 추천하세요.

## 회원 정보
- 이름: ${memberName}
- 목표: ${memberGoal || '미설정'}

## 운동 기록 (과거 → 최신)
${formatWorkoutHistory(workouts)}

## 현재 등록 루틴
${formatCurrentRoutine(currentRoutine)}

## 지침
1. 점진적 과부하 원칙을 따르세요 (보통 메인 운동 +2.5kg 또는 세트/reps 소폭 증가).
2. 14일 이상 공백이면 복귀 세션(trend: comeback) — 지난 세션과 동일 또는 소폭 감소.
3. 3세션 이상 중량 정체면 trend: plateau — 중량 유지, 세트/reps 증가.
4. 꾸준한 중량 상승이면 trend: progressing — 메인 +2.5kg, 보조 +1세트.
5. headline과 analysis는 트레이너가 회원에게 말하듯 자연스러운 한국어로 작성.
6. exercises는 현재 루틴 구조(운동 종류)를 유지하되 수치만 조정.

반드시 아래 JSON 형식만 출력하세요. 다른 텍스트 없이 JSON만:
{
  "headline": "이번 세션 이렇게 가볼까요?",
  "analysis": "2-3문장 분석 및 추천 이유",
  "trend": "progressing|plateau|comeback|maintain",
  "exercises": [
    {"name": "운동명", "weight": 60, "sets": 3, "reps": 10}
  ]
}`;
}

function parseOllamaJson(content: string): OllamaResponseJson {
  const trimmed = content.trim();
  const jsonStr = trimmed.startsWith('{')
    ? trimmed
    : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
  const parsed = JSON.parse(jsonStr) as OllamaResponseJson;

  if (!parsed.headline || !parsed.analysis || !Array.isArray(parsed.exercises)) {
    throw new Error('Invalid Ollama response structure');
  }

  const validTrends: RecommendationTrend[] = [
    'progressing',
    'plateau',
    'comeback',
    'maintain',
  ];
  if (!validTrends.includes(parsed.trend)) {
    parsed.trend = 'maintain';
  }

  parsed.exercises = parsed.exercises.map((ex) => ({
    name: String(ex.name),
    weight: Number(ex.weight) || 0,
    sets: Math.max(1, Math.round(Number(ex.sets) || 3)),
    reps: Math.max(1, Math.round(Number(ex.reps) || 10)),
  }));

  return parsed;
}

async function generateWithOllama(
  memberName: string,
  memberGoal: string,
  workouts: WorkoutRecord[],
  currentRoutine: Exercise[],
  baseExercises: Exercise[],
): Promise<RoutineRecommendationResult> {
  const prompt = buildPrompt(memberName, memberGoal, workouts, currentRoutine);

  const res = await fetchWithTimeout(
    `${OLLAMA_BASE}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        format: 'json',
        options: { temperature: 0.4, num_predict: 1024 },
      }),
    },
    REQUEST_TIMEOUT_MS,
  );

  if (!res.ok) {
    throw new Error(`Ollama API error: ${res.status}`);
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) throw new Error('Empty Ollama response');

  const parsed = parseOllamaJson(content);

  return {
    ...buildRecommendationFromExercises(
      parsed.headline,
      parsed.analysis,
      parsed.trend,
      parsed.exercises.map((ex) => ({ id: generateId(), ...ex })),
      baseExercises,
    ),
    source: 'ai',
  };
}

export async function fetchRoutineRecommendation(
  memberName: string,
  memberGoal: string,
  workoutHistory: WorkoutRecord[],
  memberId: string,
  currentRoutine: Exercise[],
): Promise<RoutineRecommendationResult | null> {
  const workouts = getMemberWorkouts(memberId, workoutHistory);
  const baseExercises =
    workouts.length > 0
      ? workouts[workouts.length - 1]!.exercises
      : currentRoutine;

  if (baseExercises.length === 0) return null;

  const rulesFallback = (): RoutineRecommendationResult | null => {
    const rec = generateRoutineRecommendation(
      memberName,
      memberGoal,
      workoutHistory,
      memberId,
      currentRoutine,
    );
    return rec ? { ...rec, source: 'rules' } : null;
  };

  try {
    const available = await checkOllamaAvailable();
    if (!available) return rulesFallback();

    return await generateWithOllama(
      memberName,
      memberGoal,
      workouts,
      currentRoutine,
      baseExercises,
    );
  } catch {
    return rulesFallback();
  }
}

export { OLLAMA_MODEL, OLLAMA_BASE };
