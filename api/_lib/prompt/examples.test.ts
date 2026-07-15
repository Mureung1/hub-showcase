import { describe, expect, it } from 'vitest'
import { requirePromptExamplePair, type PromptExampleSet } from './examples'

const examplePair: readonly PromptExampleSet[] = [
  {
    scenarioId: 'groupwork',
    purpose: 'ask',
    situation: ' 예시 검증용 가상 상황 A ',
    candidates: [
      { toneLevel: 3, text: '테스트 문장 A를 확인해 주세요.' },
      { toneLevel: 1, text: '테스트 문장 A 확인 부탁드려요.' },
      { toneLevel: 2, text: '가능할 때 테스트 문장 A를 확인해 주실 수 있을까요?' },
    ],
  },
  {
    scenarioId: 'groupwork',
    purpose: 'suggest',
    situation: '예시 검증용 가상 상황 B',
    receivedMessage: ' 테스트 입력 B ',
    candidates: [
      { toneLevel: 1, text: '테스트 제안 B를 같이 확인해 봐요.' },
      { toneLevel: 2, text: '괜찮다면 테스트 제안 B를 같이 확인해 볼까요?' },
      { toneLevel: 3, text: '테스트 제안 B의 가능 여부를 먼저 확인해 주세요.' },
    ],
  },
]

describe('requirePromptExamplePair', () => {
  it('정확히 두 세트를 정규화하고 후보를 1·2·3 순서로 만든다', () => {
    const result = requirePromptExamplePair('groupwork', examplePair)

    expect(result).toHaveLength(2)
    expect(result[0].situation).toBe('예시 검증용 가상 상황 A')
    expect(result[0].candidates.map((candidate) => candidate.toneLevel)).toEqual([1, 2, 3])
    expect(result[1].receivedMessage).toBe('테스트 입력 B')
  })

  it('예시 세트가 두 개가 아니면 거절한다', () => {
    expect(() => requirePromptExamplePair('groupwork', [examplePair[0]])).toThrow(
      'exactly two reviewed example sets',
    )
  })

  it('현재 요청과 다른 관계의 예시를 거절한다', () => {
    const mismatched: readonly PromptExampleSet[] = [
      examplePair[0],
      { ...examplePair[1], scenarioId: 'friend' },
    ]

    expect(() => requirePromptExamplePair('groupwork', mismatched)).toThrow(
      'must match the scenario',
    )
  })

  it('1·2·3 톤이 각각 하나가 아니거나 문장이 중복되면 거절한다', () => {
    const invalidTones: readonly PromptExampleSet[] = [
      {
        ...examplePair[0],
        candidates: [
          { toneLevel: 1, text: '같은 테스트 문장' },
          { toneLevel: 1, text: '같은 테스트 문장' },
          { toneLevel: 3, text: '다른 테스트 문장' },
        ],
      },
      examplePair[1],
    ]

    expect(() => requirePromptExamplePair('groupwork', invalidTones)).toThrow(
      'generation contract',
    )
  })

  it('비어 있거나 계약 길이를 넘는 예시 상황을 거절한다', () => {
    const invalidSituation: readonly PromptExampleSet[] = [
      { ...examplePair[0], situation: ' ' },
      examplePair[1],
    ]

    expect(() => requirePromptExamplePair('groupwork', invalidSituation)).toThrow(
      'generation contract',
    )
  })
})
