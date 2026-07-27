import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  generateContent: vi.fn(),
}))

vi.mock('./env.js', () => ({ GEMINI_API_KEY: 'test-key' }))

vi.mock('@google/genai', () => {
  class GoogleGenAI {
    models = { generateContent: state.generateContent }
  }
  return {
    GoogleGenAI,
    createUserContent: (parts: unknown) => parts,
    createPartFromBase64: (data: string, mimeType: string) => ({ inlineData: { data, mimeType } }),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING', INTEGER: 'INTEGER', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
  }
})

const FIELDS = {
  employees: null,
  employeesMaxCount: null,
  revenue: null,
  revenueMaxKrw: null,
  businessYears: '업력 7년 미만',
  businessYearsMax: 7,
  amount: null,
  qualifications: ['조건 1'],
  documents: null,
}

function quotaError() {
  return new Error(
    '{"error":{"code":429,"message":"quota exceeded","status":"RESOURCE_EXHAUSTED"}}',
  )
}

describe('extractStructuredFields', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { resetBudgetState } = await import('./gemini-extract.js')
    resetBudgetState()
  })

  it('주 모델이 성공하면 그 결과를 그대로 반환한다', async () => {
    state.generateContent.mockResolvedValueOnce({ text: JSON.stringify(FIELDS) })
    const { extractStructuredFields } = await import('./gemini-extract.js')

    const result = await extractStructuredFields({ type: 'text', text: '문서 내용' })

    expect(result.model).toBe('gemini-2.5-flash')
    expect(result.fields).toEqual(FIELDS)
    expect(state.generateContent).toHaveBeenCalledTimes(1)
  })

  it('주 모델이 429(할당량 초과)면 보조 모델로 대체한다', async () => {
    state.generateContent
      .mockRejectedValueOnce(quotaError())
      .mockResolvedValueOnce({ text: JSON.stringify(FIELDS) })
    const { extractStructuredFields } = await import('./gemini-extract.js')

    const result = await extractStructuredFields({ type: 'text', text: '문서 내용' })

    expect(result.model).toBe('gemini-3.1-flash-lite')
    expect(state.generateContent).toHaveBeenCalledTimes(2)
  })

  it('할당량 오류가 아닌 다른 에러는 즉시 전파하고 보조 모델을 시도하지 않는다', async () => {
    state.generateContent.mockRejectedValueOnce(new Error('네트워크 끊김'))
    const { extractStructuredFields } = await import('./gemini-extract.js')

    await expect(extractStructuredFields({ type: 'text', text: '문서 내용' })).rejects.toThrow(
      '네트워크 끊김',
    )
    expect(state.generateContent).toHaveBeenCalledTimes(1)
  })

  it('두 모델 다 소진되면 이후 호출은 네트워크 요청 없이 즉시 QuotaExhaustedError를 던진다', async () => {
    state.generateContent.mockRejectedValue(quotaError())
    const { extractStructuredFields, isBudgetExhausted, QuotaExhaustedError } = await import(
      './gemini-extract.js'
    )

    await expect(extractStructuredFields({ type: 'text', text: '문서 1' })).rejects.toThrow(
      QuotaExhaustedError,
    )
    expect(isBudgetExhausted()).toBe(true)

    state.generateContent.mockClear()
    await expect(extractStructuredFields({ type: 'text', text: '문서 2' })).rejects.toThrow(
      QuotaExhaustedError,
    )
    expect(state.generateContent).not.toHaveBeenCalled()
  })
})
