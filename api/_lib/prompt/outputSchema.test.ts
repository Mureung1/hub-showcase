import { describe, expect, it } from 'vitest'
import {
  generatedReplyJsonSchema,
  generatedReplyOutputConfig,
  isAcceptedStopReason,
  parseCompletedStructuredOutput,
} from './outputSchema.js'

const validReply = {
  candidates: [
    { toneLevel: 3, text: '더 분명한 테스트 문장입니다.' },
    { toneLevel: 1, text: '기본 테스트 문장입니다.' },
    { toneLevel: 2, text: '더 부드러운 테스트 문장입니다.' },
  ],
  situationSummary: '테스트용 요약',
}

describe('generatedReplyOutputConfig', () => {
  it('output_config.format의 JSON Schema가 후보와 추가 필드를 제한한다', () => {
    expect(generatedReplyOutputConfig.format.type).toBe('json_schema')
    expect(generatedReplyOutputConfig.format.schema).toBe(generatedReplyJsonSchema)
    expect(generatedReplyJsonSchema.required).toEqual(['candidates'])
    expect(generatedReplyJsonSchema.additionalProperties).toBe(false)
    expect(generatedReplyJsonSchema.properties.candidates.minItems).toBe(3)
    expect(generatedReplyJsonSchema.properties.candidates.maxItems).toBe(3)
    expect(
      generatedReplyJsonSchema.properties.candidates.items.properties.toneLevel.enum,
    ).toEqual([1, 2, 3])
    expect(generatedReplyJsonSchema.properties.candidates.items.additionalProperties).toBe(false)
  })
})

describe('parseCompletedStructuredOutput', () => {
  it('end_turn으로 정상 완료된 JSON을 공용 계약으로 재검증하고 톤 순서를 정규화한다', () => {
    const result = parseCompletedStructuredOutput('end_turn', JSON.stringify(validReply))

    expect(result?.candidates.map((candidate) => candidate.toneLevel)).toEqual([1, 2, 3])
    expect(result?.situationSummary).toBe('테스트용 요약')
  })

  it.each([
    'max_tokens',
    'stop_sequence',
    'tool_use',
    'pause_turn',
    'refusal',
    'model_context_window_exceeded',
  ])(
    '%s 종료는 정상 결과로 승인하지 않는다',
    (stopReason) => {
      expect(parseCompletedStructuredOutput(stopReason, JSON.stringify(validReply))).toBeNull()
    },
  )

  it('잘못된 JSON과 런타임 계약 위반을 거절한다', () => {
    expect(parseCompletedStructuredOutput('end_turn', '{')).toBeNull()
    expect(
      parseCompletedStructuredOutput(
        'end_turn',
        JSON.stringify({
          candidates: [
            { toneLevel: 1, text: '중복 톤 A' },
            { toneLevel: 1, text: '중복 톤 B' },
            { toneLevel: 3, text: '톤 C' },
          ],
        }),
      ),
    ).toBeNull()
  })

  it('명백한 협박 표현이 포함된 구조화 결과를 거절한다', () => {
    expect(
      parseCompletedStructuredOutput(
        'end_turn',
        JSON.stringify({
          ...validReply,
          candidates: [
            { toneLevel: 1, text: '기본 테스트 문장입니다.' },
            { toneLevel: 2, text: '더 부드러운 테스트 문장입니다.' },
            { toneLevel: 3, text: '가만두지 않겠다는 협박 문장입니다.' },
          ],
        }),
      ),
    ).toBeNull()
  })
})

describe('isAcceptedStopReason', () => {
  it('end_turn만 정상 완료로 좁힌다', () => {
    expect(isAcceptedStopReason('end_turn')).toBe(true)
    expect(isAcceptedStopReason('refusal')).toBe(false)
    expect(isAcceptedStopReason(undefined)).toBe(false)
  })
})
