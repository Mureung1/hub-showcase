import type { VisionApiClient, VisionImageInput } from '../types/visionApi'
import { generateGeminiText } from './geminiClient'
import { getAllItemNames } from './itemService'

// Gemini Vision으로 사진 속 재활용 대상 물체의 Top Prediction 하나만 받는다.
// Confidence Score는 요청하지 않는다 — 신뢰도 기반 분기 없이 항상 Confirm 화면으로 진행하는 정책과 일치.
//
// 카탈로그 목록을 프롬프트에 텍스트로 포함하는 이유: responseSchema.enum으로 731개 품목명을 강제하려 했으나
// Gemini API가 "too much branching for serving"(400)으로 거부함 — enum은 이 규모에서 쓸 수 없는 하드 리밋.
// 대신 목록을 참고 텍스트로 보여주고 "목록에 있으면 그 표기 그대로" 답하도록 유도한다. 완전한 보장은 아니지만
// (예: 실제 사례 — "크레용"이 아니라 "크레파스"가 카탈로그 표기임을 모델이 알고 정확히 답할 확률이 높아짐),
// findBestMatchingItem의 공백 정규화 매칭이 최종 안전망 역할을 한다.
const PROMPT_PREFIX =
  '사진 속에서 분리배출 대상이 되는 실제 물체를 하나만 찾아라. ' +
  '사진이 물체 사진이 아니거나(아이콘, 일러스트, 추상적 그래픽 등), 물체가 무엇인지 확신이 서지 않으면 ' +
  '반드시 "unknown"이라고만 답하라 — 목록에 있는 단어를 억지로 고르지 마라. ' +
  '실제 물체를 확실히 찾았을 때만 아래 규칙을 따른다: ' +
  '아래는 대한민국 공공데이터포털의 실제 분리배출 품목명 목록이다. ' +
  '그 물체와 정확히 일치하거나 가장 비슷한 품목명이 이 목록에 있으면, 그 표기를 정확히 그대로(띄어쓰기 포함) 답하라. ' +
  '목록에 적절한 품목이 없으면 목록과 비슷한 스타일의 짧은 한국어 명사구로 답하라. ' +
  '설명이나 문장부호 없이 명사만 한 줄로 출력하라.\n' +
  '품목명 목록: '

async function recognizeObject(image: VisionImageInput): Promise<string | null> {
  const base64 = image.buffer.toString('base64')
  const itemNames = await getAllItemNames()
  const prompt = `${PROMPT_PREFIX}${itemNames.join(', ')}`

  const text = await generateGeminiText([prompt, { inlineData: { data: base64, mimeType: image.mimeType } }])

  const label = text.trim()
  if (!label || label.toLowerCase() === 'unknown') {
    return null
  }
  return label
}

export const geminiVisionApiClient: VisionApiClient = { recognizeObject }
