import type { BilingualDisposalExplanation, ExplanationClient } from '../types/explanation'

// Gemini API 키가 준비되지 않았을 때 대체할 mock — 원본 배출방법 텍스트를 안내 문구 하나로만 감싼다
async function generateExplanation(govItemName: string, method: string): Promise<BilingualDisposalExplanation> {
  return {
    ko: {
      steps: [`${govItemName}은(는) 공식 배출방법(${method})에 따라 배출하세요.`],
      parts: [],
      commonMistakes: [],
      reason: '공공데이터포털의 공식 분리배출 정보를 기반으로 안내합니다.',
    },
    en: {
      steps: [`Dispose of ${govItemName} according to the official method (${method}).`],
      parts: [],
      commonMistakes: [],
      reason: 'Based on official disposal information from the Korea Public Data Portal.',
    },
  }
}

export const mockExplanationClient: ExplanationClient = { generateExplanation }
