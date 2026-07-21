import { z } from 'zod'
import type { DisposalExplanation, ExplanationClient } from '../types/explanation'
import { generateGeminiText } from './geminiClient'

const explanationSchema = z.object({
  steps: z.array(z.string()).min(1),
  parts: z.array(z.object({ part: z.string(), category: z.string() })).default([]),
  commonMistakes: z.array(z.string()).default([]),
  reason: z.string(),
})

const PROMPT_PREFIX =
  '너는 대한민국 공공데이터포털의 공식 분리배출 정보를 사용자에게 쉽게 설명하는 도우미다. ' +
  '아래 공식 데이터를 절대 새로운 규정으로 바꾸지 말고, 있는 그대로의 의미 안에서만 이해하기 쉽게 가공하라. ' +
  '품목명과 공식 배출방법 태그를 바탕으로 다음 JSON 형식으로만 답하라: ' +
  '{"steps": string[] (배출 준비 단계, 한국어 짧은 문장 여러 개), ' +
  '"parts": {"part": string, "category": string}[] (여러 재질로 분리해서 버려야 하는 품목일 때만 채우고, 아니면 빈 배열), ' +
  '"commonMistakes": string[] (자주 하는 실수, 없으면 빈 배열), ' +
  '"reason": string (왜 이렇게 배출해야 하는지 한 문단 설명)}.'

async function generateExplanation(govItemName: string, method: string): Promise<DisposalExplanation> {
  const text = await generateGeminiText([`${PROMPT_PREFIX}\n품목명: ${govItemName}\n공식 배출방법: ${method}`], {
    responseMimeType: 'application/json',
  })

  return explanationSchema.parse(JSON.parse(text))
}

export const geminiExplanationClient: ExplanationClient = { generateExplanation }
