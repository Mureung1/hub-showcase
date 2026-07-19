import { ApiError, GoogleGenAI } from '@google/genai'

// 무료 티어 사용 — gemini-2.5-flash가 일일 한도(RPD)에 걸리면 gemini-2.5-flash-lite로 자동 폴백
const MODEL_FALLBACK_CHAIN = ['gemini-2.5-flash', 'gemini-2.5-flash-lite']

export type GeminiContentPart = string | { inlineData: { data: string; mimeType: string } }

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되어 있지 않습니다')
  }
  client ??= new GoogleGenAI({ apiKey })
  return client
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 429
}

export async function generateGeminiText(contents: GeminiContentPart[], responseMimeType?: string): Promise<string> {
  let lastError: unknown

  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents,
        config: responseMimeType ? { responseMimeType } : undefined,
      })
      if (!response.text) {
        throw new Error('Gemini 응답이 비어 있습니다')
      }
      return response.text
    } catch (error) {
      lastError = error
      if (!isRateLimitError(error)) {
        throw error
      }
    }
  }

  throw lastError
}
