import { createPartFromBase64, createUserContent, GoogleGenAI, Type } from '@google/genai'
import { GEMINI_API_KEY } from './env.js'

/**
 * 이슈 #67 묶음 1 스파이크에서 검증한 모델·스키마.
 * - `gemini-2.5-flash`: 무료 티어 하루 20건/모델로 제한(429 실측) — 주 모델
 * - `gemini-3.1-flash-lite`: 별도 할당량 버킷 — 한도 초과 시 대체용(정확도는 flash와 별개로 계속 관찰 필요)
 */
const PRIMARY_MODEL = 'gemini-2.5-flash'
const SECONDARY_MODEL = 'gemini-3.1-flash-lite'

/** SDK 자체는 요청 타임아웃을 안 걸어서(2026-07-30 실측: 10분간 응답 없이 멈춤), 상한을 명시한다 */
const GENERATE_TIMEOUT_MS = 60_000

export interface ExtractedFields {
  employees: string | null
  employeesMaxCount: number | null
  revenue: string | null
  revenueMaxKrw: number | null
  businessYears: string | null
  businessYearsMax: number | null
  amount: string | null
  qualifications: string[] | null
  documents: string[] | null
}

export interface ExtractionResult {
  model: string
  fields: ExtractedFields
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    employees: { type: Type.STRING, nullable: true, description: '직원 수 제한 조건 원문 그대로 (예: "상시근로자 50인 미만"). 명시 없으면 null' },
    employeesMaxCount: { type: Type.INTEGER, nullable: true, description: 'employees 조건의 최대 상시근로자 수를 정수로 변환. "50인 미만"→50. 업종별로 기준이 달라 단일 숫자로 못 정하거나 조건이 없으면 null' },
    revenue: { type: Type.STRING, nullable: true, description: '매출액 제한 조건 원문 그대로 (예: "직전연도 매출액 120억원 이하"). 명시 없으면 null' },
    revenueMaxKrw: { type: Type.INTEGER, nullable: true, description: 'revenue 조건의 최대 매출액을 원(KRW) 단위 정수로 변환(억=1e8, 천만=1e7, 백만=1e6, 만=1e4). 애매하면 null' },
    businessYears: { type: Type.STRING, nullable: true, description: '업력(창업/설립 연차) 제한 조건 원문 그대로 (예: "창업 7년 이내"). 명시 없으면 null' },
    businessYearsMax: { type: Type.NUMBER, nullable: true, description: 'businessYears 조건의 최대 업력(년)을 숫자로 변환. "7년 미만"→7. 단순 연차로 환산 불가능하면 null' },
    amount: { type: Type.STRING, nullable: true, description: '지원금액 (예: "최대 3억원"). 명시 없으면 null' },
    qualifications: {
      type: Type.ARRAY,
      nullable: true,
      items: { type: Type.STRING },
      description: '신청자격 조건 목록 (각 항목은 문서에 실제로 적힌 조건 하나씩). 명시 없으면 null',
    },
    documents: {
      type: Type.ARRAY,
      nullable: true,
      items: { type: Type.STRING },
      description: '제출서류 목록 (문서 내 "제출서류"/"신청서류" 섹션 항목). 명시 없으면 null',
    },
  },
  required: [
    'employees',
    'employeesMaxCount',
    'revenue',
    'revenueMaxKrw',
    'businessYears',
    'businessYearsMax',
    'amount',
    'qualifications',
    'documents',
  ],
}

const PROMPT = `첨부된 정부 지원사업 공고문에서 아래 정보를 추출해 JSON으로 반환하세요.
- 각 필드는 문서에 실제로 명시된 내용만 담고, 추측하지 마세요.
- 명시되지 않은 필드는 null로 두세요.
- employees/revenue/businessYears/amount는 문서 원문 표현을 최대한 그대로 사용하세요.
- *MaxCount/*MaxKrw/*Max 숫자 필드는 대응 텍스트에서 계산 가능한 경우에만 채우고, 애매하면 null로 두세요.
- qualifications/documents는 문서에 나열된 항목을 배열로 정리하세요 (원문 그대로, 요약하지 마세요).`

export type ExtractionDocument = { type: 'pdf'; base64: string } | { type: 'text'; text: string }

export class QuotaExhaustedError extends Error {
  constructor() {
    super('무료 티어 할당량 소진 — 모든 모델에서 429')
    this.name = 'QuotaExhaustedError'
  }
}

function isQuotaError(err: unknown): boolean {
  return err instanceof Error && /RESOURCE_EXHAUSTED|"code":429/.test(err.message)
}

let ai: GoogleGenAI | undefined
function client(): GoogleGenAI {
  ai ??= new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  return ai
}

// 모델별 할당량 소진 여부 — 한 번 소진되면 같은 프로세스 실행 동안은 재시도하지 않는다
// (남은 항목마다 헛되이 429를 또 받는 것을 방지)
const exhausted = { [PRIMARY_MODEL]: false, [SECONDARY_MODEL]: false }

export function isBudgetExhausted(): boolean {
  return exhausted[PRIMARY_MODEL] && exhausted[SECONDARY_MODEL]
}

/** 테스트에서 모델별 소진 상태를 리셋하기 위한 헬퍼 */
export function resetBudgetState(): void {
  exhausted[PRIMARY_MODEL] = false
  exhausted[SECONDARY_MODEL] = false
}

function buildContentParts(document: ExtractionDocument): (string | ReturnType<typeof createPartFromBase64>)[] {
  if (document.type === 'pdf') {
    return [createPartFromBase64(document.base64, 'application/pdf'), PROMPT]
  }
  return [`${PROMPT}\n\n---문서 원문---\n${document.text}`]
}

async function generate(model: string, document: ExtractionDocument): Promise<ExtractedFields> {
  const response = await client().models.generateContent({
    model,
    contents: createUserContent(buildContentParts(document)),
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      httpOptions: { timeout: GENERATE_TIMEOUT_MS },
    },
  })
  return JSON.parse(response.text ?? '') as ExtractedFields
}

/**
 * PDF/HWPX 텍스트에서 구조화 필드를 추출한다. 주 모델이 할당량 초과(429)면 보조 모델로 대체.
 * 두 모델 다 소진되면 QuotaExhaustedError를 던진다 — 호출부(ai-enrichment.ts)에서 개별 처리.
 */
export async function extractStructuredFields(document: ExtractionDocument): Promise<ExtractionResult> {
  if (!exhausted[PRIMARY_MODEL]) {
    try {
      return { model: PRIMARY_MODEL, fields: await generate(PRIMARY_MODEL, document) }
    } catch (err) {
      if (!isQuotaError(err)) throw err
      exhausted[PRIMARY_MODEL] = true
    }
  }

  if (!exhausted[SECONDARY_MODEL]) {
    try {
      return { model: SECONDARY_MODEL, fields: await generate(SECONDARY_MODEL, document) }
    } catch (err) {
      if (!isQuotaError(err)) throw err
      exhausted[SECONDARY_MODEL] = true
    }
  }

  throw new QuotaExhaustedError()
}
