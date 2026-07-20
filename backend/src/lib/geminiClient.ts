import { GoogleGenAI, Schema } from '@google/genai';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

if (!geminiApiKey) {
  throw new Error('GEMINI_API_KEY must be set in .env');
}

export const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// 프롬프트와 JSON 스키마를 받아, 스키마를 만족하는 파싱된 객체를 반환한다.
// systemInstruction으로 역할/지시문을, prompt로 실제 입력 데이터를 분리해 전달한다.
export async function generateStructuredJson<T>(params: {
  systemInstruction: string;
  prompt: string;
  responseSchema: Schema;
  temperature?: number;
}): Promise<T> {
  const { systemInstruction, prompt, responseSchema, temperature = 0.1 } = params;

  const response = await genAI.models.generateContent({
    model: geminiModel,
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
  } catch (parseErr) {
    throw new Error(`Gemini 응답을 JSON으로 파싱하지 못했습니다: ${text}`);
  }
}
