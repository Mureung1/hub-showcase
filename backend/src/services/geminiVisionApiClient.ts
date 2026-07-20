import type { VisionApiClient, VisionImageInput } from '../types/visionApi'
import { generateGeminiText } from './geminiClient'

// Gemini Vision으로 사진 속 재활용 대상 물체의 Top Prediction 하나만 받는다.
// Confidence Score는 요청하지 않는다 — 신뢰도 기반 분기 없이 항상 Confirm 화면으로 진행하는 정책과 일치.
const PROMPT =
  '사진 속에서 분리배출 대상이 되는 물체를 하나만 찾아, 그 물체를 가리키는 영어 단어나 짧은 구를 한 줄로만 답하라. ' +
  '설명이나 문장부호 없이 라벨만 출력하라. 물체를 특정할 수 없으면 "unknown"이라고만 답하라.'

async function recognizeObject(image: VisionImageInput): Promise<string | null> {
  const base64 = image.buffer.toString('base64')

  const text = await generateGeminiText([PROMPT, { inlineData: { data: base64, mimeType: image.mimeType } }])

  const label = text.trim().toLowerCase()
  if (!label || label === 'unknown') {
    return null
  }
  return label
}

export const geminiVisionApiClient: VisionApiClient = { recognizeObject }
