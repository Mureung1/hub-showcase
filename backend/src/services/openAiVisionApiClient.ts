import OpenAI from 'openai'
import type { VisionApiClient, VisionImageInput } from '../types/visionApi'

// OpenAI Vision API로 사진 속 재활용 대상 물체의 Top Prediction 하나만 받는다.
// Confidence Score는 요청하지 않는다 — 신뢰도 기반 분기 없이 항상 Confirm 화면으로 진행하는 정책과 일치.
const MODEL = 'gpt-4o-mini'

const PROMPT =
  '사진 속에서 분리배출 대상이 되는 물체를 하나만 찾아, 그 물체를 가리키는 영어 단어나 짧은 구를 한 줄로만 답하라. ' +
  '설명이나 문장부호 없이 라벨만 출력하라. 물체를 특정할 수 없으면 "unknown"이라고만 답하라.'

let client: OpenAI | null = null

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY가 설정되어 있지 않습니다')
  }
  client ??= new OpenAI({ apiKey })
  return client
}

async function recognizeObject(image: VisionImageInput): Promise<string | null> {
  const base64 = image.buffer.toString('base64')

  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 20,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${base64}` } },
        ],
      },
    ],
  })

  const label = response.choices[0]?.message?.content?.trim().toLowerCase()
  if (!label || label === 'unknown') {
    return null
  }
  return label
}

export const openAiVisionApiClient: VisionApiClient = { recognizeObject }
