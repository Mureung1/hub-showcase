import { describe, expect, it } from 'vitest'
import { purposes, scenarios, type Mode } from '../../../src/entities/message/index.js'
import {
  candidateMaxLength,
  parseGeneratedReply,
  receivedMessageMaxLength,
  situationMaxLength,
} from '../../../src/shared/generation/contracts.js'
import { reviewedPromptExampleCatalog } from '../prompt/seedExamples.js'
import {
  retrievalCoverageCandidateDraft,
  retrievalCoverageDraftCatalogVersion,
} from './coverageCandidateDraft.js'
import { reviewedRetrievalCatalog } from './catalog.js'

const modes = ['reply', 'initiate'] as const satisfies readonly Mode[]
const forbiddenContent = /\[[^\]]+\]|\bOO\b|○○|가족상|교통사고가 났|병원에 입원/u
const coerciveContent = /무조건|당장|핑계 대지|시간 비워|알아서 해|반드시 해야/u

const sentenceCount = (text: string) =>
  text
    .split(/[.!?]+(?:\s|$)/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length

describe('retrieval coverage candidate draft', () => {
  it('기존 8세트를 건드리지 않고 신규 88세트·264후보를 draft로 분리한다', () => {
    expect(reviewedPromptExampleCatalog).toHaveLength(8)
    expect(reviewedRetrievalCatalog).toHaveLength(8)
    expect(retrievalCoverageCandidateDraft).toHaveLength(88)
    expect(retrievalCoverageCandidateDraft.flatMap((set) => set.candidates)).toHaveLength(264)
    expect(new Set(retrievalCoverageCandidateDraft.map((set) => set.exampleId)).size).toBe(88)
    expect(
      retrievalCoverageCandidateDraft.every(
        (set) =>
          set.reviewStatus === 'draft' &&
          set.catalogVersion === retrievalCoverageDraftCatalogVersion,
      ),
    ).toBe(true)
  })

  it('기존 검수 세트와 합치면 48개 관계·목적·모드 cell에 정확히 2세트씩 있다', () => {
    const combined = [...reviewedPromptExampleCatalog, ...retrievalCoverageCandidateDraft]

    expect(combined).toHaveLength(96)
    scenarios.forEach((scenario) => {
      purposes.forEach((purpose) => {
        modes.forEach((mode) => {
          expect(
            combined.filter(
              (set) =>
                set.scenarioId === scenario.id &&
                set.purpose === purpose.id &&
                set.mode === mode,
            ),
            `${scenario.id}/${purpose.id}/${mode}`,
          ).toHaveLength(2)
        })
      })
    })
  })

  it('모드·톤·길이·금지 항목·정중함 하한선을 전수 자체 스크리닝한다', () => {
    retrievalCoverageCandidateDraft.forEach((set) => {
      expect(set.situation.trim().length, set.exampleId).toBeGreaterThan(0)
      expect(set.situation.length, set.exampleId).toBeLessThanOrEqual(situationMaxLength)
      expect(set.mode, set.exampleId).toBe(set.receivedMessage ? 'reply' : 'initiate')
      expect(forbiddenContent.test(set.situation), set.exampleId).toBe(false)

      if (set.mode === 'reply') {
        expect(set.receivedMessage?.trim().length, set.exampleId).toBeGreaterThan(0)
        expect(set.receivedMessage?.length, set.exampleId).toBeLessThanOrEqual(
          receivedMessageMaxLength,
        )
      } else {
        expect(set.receivedMessage, set.exampleId).toBeUndefined()
      }

      expect(parseGeneratedReply({ candidates: set.candidates }), set.exampleId).not.toBeNull()
      expect(set.candidates.map((candidate) => candidate.toneLevel), set.exampleId).toEqual([
        1, 2, 3,
      ])
      expect(new Set(set.candidates.map((candidate) => candidate.text)).size, set.exampleId).toBe(3)

      set.candidates.forEach((candidate) => {
        expect(candidate.text.length, set.exampleId).toBeLessThanOrEqual(candidateMaxLength)
        expect(forbiddenContent.test(candidate.text), set.exampleId).toBe(false)
        expect(coerciveContent.test(candidate.text), set.exampleId).toBe(false)

        const count = sentenceCount(candidate.text)
        if (set.scenarioId === 'professor') {
          expect(count, `${set.exampleId}/tone-${candidate.toneLevel}`).toBeGreaterThanOrEqual(3)
          expect(count, `${set.exampleId}/tone-${candidate.toneLevel}`).toBeLessThanOrEqual(6)
        } else {
          expect(count, `${set.exampleId}/tone-${candidate.toneLevel}`).toBeGreaterThanOrEqual(1)
          expect(count, `${set.exampleId}/tone-${candidate.toneLevel}`).toBeLessThanOrEqual(3)
        }
      })
    })
  })

  it('기존·신규 example ID와 후보 문구가 서로 중복되지 않는다', () => {
    const combined = [...reviewedPromptExampleCatalog, ...retrievalCoverageCandidateDraft]
    const ids = combined.map((set) => set.exampleId)
    const messages = combined.flatMap((set) => set.candidates.map((candidate) => candidate.text))

    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(messages).size).toBe(messages.length)
  })
})
