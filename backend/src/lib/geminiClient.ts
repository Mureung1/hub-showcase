import { ApiError, GoogleGenAI, Schema } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const primaryModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY must be set in .env');
}

export const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// 1차 모델(GEMINI_MODEL)이 쿼터 초과(429)나 일시적 과부하(503)로 실패하면 순서대로 시도할
// 폴백 모델 목록. 콤마 구분 env로 오버라이드 가능. 중복은 제거한다.
// 이 배열은 호출 중 절대 커지지 않고(고정 길이), for 루프로 한 번씩만 순회하므로
// 무한 재시도가 구조적으로 불가능하다 — 재귀나 "실패하면 다시 앞으로" 로직이 없다.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.1-flash-lite')
  .split(',')
  .map((m) => m.trim())
  .filter(Boolean);

const MODEL_CHAIN = [primaryModel, ...FALLBACK_MODELS].filter(
  (model, index, arr) => arr.indexOf(model) === index, // 중복 제거 (같은 모델이 폴백에도 들어간 경우 대비)
);

// 폴백을 시도할 가치가 있는 에러인지 판단한다.
// 429(쿼터 초과)·503(일시적 과부하)만 다음 모델로 넘어가고, 그 외(400 등 요청 자체 오류)는
// 모델을 바꿔도 똑같이 실패하므로 즉시 던진다.
function isFallbackWorthy(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 429 || err.status === 503);
}

// 프롬프트와 JSON 스키마를 받아, 스키마를 만족하는 파싱된 객체를 반환한다.
// systemInstruction으로 역할/지시문을, prompt로 실제 입력 데이터를 분리해 전달한다.
export async function generateStructuredJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  temperature?: number;
}): Promise<T> {
  const { systemInstruction, prompt, responseSchema, temperature = 0.1 } = params;

  let lastError: unknown;

  for (let i = 0; i < MODEL_CHAIN.length; i++) {
    const model = MODEL_CHAIN[i];
    const isLastModel = i === MODEL_CHAIN.length - 1;

    try {
      const response = await genAI.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error('Gemini 응답에 텍스트가 없습니다.');
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new Error(`Gemini 응답을 JSON으로 파싱하지 못했습니다: ${text}`);
      }
    } catch (err) {
      lastError = err;

      if (isFallbackWorthy(err) && !isLastModel) {
        console.warn(
          `[geminiClient] ${model} 호출 실패(${(err as ApiError).status}) — ${MODEL_CHAIN[i + 1]}로 폴백합니다.`,
        );
        continue;
      }

      throw err;
    }
  }

  // MODEL_CHAIN이 비어있지 않는 한 도달하지 않지만, 타입 안정성을 위해 남겨둔다.
  throw lastError instanceof Error ? lastError : new Error('Gemini 호출에 실패했습니다.');
}
