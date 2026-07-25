import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findBestMatchingItem, getItemDisposalRule } from './itemService'

const mocks = vi.hoisted(() => ({
  itemFindMany: vi.fn(),
  itemFindUnique: vi.fn(),
  disposalRuleFindUnique: vi.fn(),
  disposalRuleCreate: vi.fn(),
  disposalRuleUpdate: vi.fn(),
  fetchDisposalMethod: vi.fn(),
  generateExplanation: vi.fn(),
}))

vi.mock('../config/prisma', () => ({
  prisma: {
    item: { findMany: mocks.itemFindMany, findUnique: mocks.itemFindUnique },
    disposalRule: {
      findUnique: mocks.disposalRuleFindUnique,
      create: mocks.disposalRuleCreate,
      update: mocks.disposalRuleUpdate,
    },
  },
}))

vi.mock('./disposalApiClient', () => ({
  getDisposalApiClient: () => ({ fetchDisposalMethod: mocks.fetchDisposalMethod }),
}))

vi.mock('./explanationClient', () => ({
  getExplanationClient: () => ({ generateExplanation: mocks.generateExplanation }),
}))

const bilingualExplanation = {
  ko: { steps: ['비운다'], parts: [], commonMistakes: [], reason: '재활용을 위해' },
  en: { steps: ['Empty it'], parts: [], commonMistakes: [], reason: 'For recycling' },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('findBestMatchingItem', () => {
  it('공백을 제거하면 정확히 일치하는 품목이 있으면 그 품목을 우선 반환한다', async () => {
    // "헤어스프레이전용리필"도 부분 일치 후보지만, 공백 제거 후 완전히 같은 "헤어 스프레이"가 있으면 그쪽이 이겨야 한다.
    mocks.itemFindMany.mockResolvedValue([
      { id: '1', name: '헤어 스프레이' },
      { id: '2', name: '헤어스프레이 전용 리필' },
    ])

    const result = await findBestMatchingItem('헤어스프레이')

    expect(result).toEqual({ id: '1', name: '헤어 스프레이' })
  })

  it('정확 일치가 없으면 공백 무시 부분 일치로 매칭한다', async () => {
    mocks.itemFindMany.mockResolvedValue([{ id: '1', name: '플라스틱 페트병' }])

    const result = await findBestMatchingItem('페트병')

    expect(result).toEqual({ id: '1', name: '플라스틱 페트병' })
  })

  it('일치하는 품목이 없으면 null을 반환한다', async () => {
    mocks.itemFindMany.mockResolvedValue([{ id: '1', name: '유리병' }])

    const result = await findBestMatchingItem('존재하지않는물건')

    expect(result).toBeNull()
  })

  it('빈 문자열/공백만 있는 질의는 DB를 조회하지 않고 바로 null을 반환한다', async () => {
    const result = await findBestMatchingItem('   ')

    expect(result).toBeNull()
    expect(mocks.itemFindMany).not.toHaveBeenCalled()
  })
})

describe('getItemDisposalRule', () => {
  it('한/영 설명이 모두 없는 새 규정이면 한 번의 호출로 두 언어를 함께 생성해 저장한다', async () => {
    mocks.itemFindUnique.mockResolvedValue({ id: 'item-1', name: '페트병' })
    mocks.disposalRuleFindUnique.mockResolvedValue({
      itemId: 'item-1',
      govItemName: '페트병',
      method: '헹궈서 배출',
      explainedAt: null,
      explainedAtEn: null,
    })
    mocks.generateExplanation.mockResolvedValue(bilingualExplanation)
    mocks.disposalRuleUpdate.mockResolvedValue({ itemId: 'item-1', explainedAt: new Date(), explainedAtEn: new Date() })

    await getItemDisposalRule('item-1')

    expect(mocks.generateExplanation).toHaveBeenCalledTimes(1)
    expect(mocks.disposalRuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          steps: ['비운다'],
          reason: '재활용을 위해',
          stepsEn: ['Empty it'],
          reasonEn: 'For recycling',
        }),
      }),
    )
  })

  it('한국어만 캐시된 기존 항목은 영어 필드만 백필하고 기존 explainedAt은 유지한다', async () => {
    const existingKoTimestamp = new Date('2026-01-01T00:00:00Z')
    mocks.itemFindUnique.mockResolvedValue({ id: 'item-2', name: '유리병' })
    mocks.disposalRuleFindUnique.mockResolvedValue({
      itemId: 'item-2',
      govItemName: '유리병',
      method: '색상별로 분리 배출',
      explainedAt: existingKoTimestamp,
      explainedAtEn: null,
    })
    mocks.generateExplanation.mockResolvedValue(bilingualExplanation)
    mocks.disposalRuleUpdate.mockResolvedValue({ itemId: 'item-2' })

    await getItemDisposalRule('item-2')

    expect(mocks.generateExplanation).toHaveBeenCalledTimes(1)
    expect(mocks.disposalRuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          explainedAt: existingKoTimestamp,
          stepsEn: ['Empty it'],
          reasonEn: 'For recycling',
        }),
      }),
    )
  })

  it('한/영 모두 이미 캐시되어 있으면 재생성하지 않는다', async () => {
    mocks.itemFindUnique.mockResolvedValue({ id: 'item-3', name: '건전지' })
    mocks.disposalRuleFindUnique.mockResolvedValue({
      itemId: 'item-3',
      govItemName: '건전지',
      method: '폐건전지함에 배출',
      explainedAt: new Date(),
      explainedAtEn: new Date(),
    })

    await getItemDisposalRule('item-3')

    expect(mocks.generateExplanation).not.toHaveBeenCalled()
    expect(mocks.disposalRuleUpdate).not.toHaveBeenCalled()
  })
})
