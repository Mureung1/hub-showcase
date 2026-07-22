import { checkOllamaAvailable, OLLAMA_BASE, OLLAMA_MODEL } from './ollama';
import type { MealMacros, MealType } from '../types/meal';

const REQUEST_TIMEOUT_MS = 30_000;

interface MealAnalysisJson {
  carb: number;
  protein: number;
  fat: number;
  kcal: number;
  feedback: string;
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

function parseMealAnalysis(content: string): MealAnalysisJson {
  const trimmed = content.trim();
  const jsonStr = trimmed.startsWith('{')
    ? trimmed
    : trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);
  const parsed = JSON.parse(jsonStr) as MealAnalysisJson;

  return {
    carb: Math.max(0, Math.round(Number(parsed.carb) || 0)),
    protein: Math.max(0, Math.round(Number(parsed.protein) || 0)),
    fat: Math.max(0, Math.round(Number(parsed.fat) || 0)),
    kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
    feedback: String(parsed.feedback ?? '').trim(),
  };
}

function buildMealPrompt(mealType: MealType, memo: string, hasPhoto: boolean): string {
  return `당신은 영양 코치 AI입니다. 아래 식단을 분석해 탄단지와 칼로리를 추정하고, 1-2문장 한국어 피드백을 작성하세요.

- 끼니: ${mealType}
- 메모: ${memo || '(설명 없음)'}
- 사진 첨부: ${hasPhoto ? '예 (내용은 메모 기준으로 추정)' : '아니오'}

반드시 아래 JSON만 출력:
{
  "carb": 0,
  "protein": 0,
  "fat": 0,
  "kcal": 0,
  "feedback": "짧은 한국어 피드백"
}`;
}

/** Ollama로 식단 macros·피드백 추정. 실패 시 null. */
export async function analyzeMealWithAi(
  mealType: MealType,
  memo: string,
  hasPhoto: boolean,
): Promise<{ macros: MealMacros; aiFeedback: string } | null> {
  try {
    const available = await checkOllamaAvailable();
    if (!available) return null;

    const res = await fetchWithTimeout(
      `${OLLAMA_BASE}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [{ role: 'user', content: buildMealPrompt(mealType, memo, hasPhoto) }],
          stream: false,
          format: 'json',
          options: { temperature: 0.3, num_predict: 512 },
        }),
      },
      REQUEST_TIMEOUT_MS,
    );

    if (!res.ok) return null;

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content;
    if (!content) return null;

    const parsed = parseMealAnalysis(content);
    if (!parsed.feedback) return null;

    return {
      macros: {
        carb: parsed.carb,
        protein: parsed.protein,
        fat: parsed.fat,
        kcal: parsed.kcal,
      },
      aiFeedback: parsed.feedback,
    };
  } catch {
    return null;
  }
}
