/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { toneLabels, type ScenarioId, type SituationId, type SpeechStyleId } from './message'
import { templateCandidatesFor } from './situationTemplates'
import {
  generatedTemplateManifest,
  generatedTemplates,
} from './templateCompiler/generated/templates.generated'

const speechStyleIds: SpeechStyleId[] = ['seumnida', 'haeyo', 'ida', 'yongyong']
const scenarioSituations: Record<ScenarioId, SituationId[]> = {
  groupwork: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'contribution_check'],
  professor: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'absence_inquiry'],
  senior: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'casual_request'],
  friend: ['schedule', 'thanks_check', 'ask', 'apologize', 'decline', 'express_feelings'],
}

describe('상황 카드 개인 말투 템플릿', () => {
  it('승인된 생성 산출물 288개를 같은 키와 문구로 조회한다', () => {
    expect(generatedTemplateManifest.reviewStatus).toBe('approved')
    expect(generatedTemplateManifest.setCount).toBe(96)
    expect(generatedTemplateManifest.templateCount).toBe(288)
    expect(generatedTemplates).toHaveLength(288)

    for (const template of generatedTemplates) {
      const candidates = templateCandidatesFor(
        template.scenarioId,
        template.situationId,
        template.speechStyleId,
      )

      expect(candidates?.find((candidate) => candidate.toneLevel === template.toneLevel)?.text).toBe(
        template.message,
      )
    }
  })

  it('정적 템플릿 조회 중 생성 API를 호출하지 않는다', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    try {
      expect(templateCandidatesFor('friend', 'schedule', 'haeyo')).toHaveLength(3)
      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      fetchSpy.mockRestore()
    }
  })

  it('96세트와 288개 정적 문구를 누락 없이 제공한다', () => {
    const allTexts: string[] = []
    let setCount = 0

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId)

          expect(candidates, `${scenarioId}/${situationId}/${speechStyleId}`).not.toBeNull()
          expect(candidates).toHaveLength(3)
          expect(candidates?.map((candidate) => candidate.toneLevel)).toEqual([1, 2, 3])
          expect(candidates?.map((candidate) => candidate.toneLabel)).toEqual([
            toneLabels[1],
            toneLabels[2],
            toneLabels[3],
          ])

          const texts = candidates?.map((candidate) => candidate.text) ?? []
          expect(texts.every((text) => text.length > 0 && text === text.trim())).toBe(true)
          expect(new Set(texts).size).toBe(3)

          allTexts.push(...texts)
          setCount += 1
        }
      }
    }

    const duplicates = allTexts.filter((text, index) => allTexts.indexOf(text) !== index)
    expect(setCount).toBe(96)
    expect(allTexts).toHaveLength(288)
    expect(duplicates).toEqual([])
  })

  it('관계에 없는 상황 조합은 조회하지 않는다', () => {
    expect(templateCandidatesFor('groupwork', 'absence_inquiry', 'haeyo')).toBeNull()
    expect(templateCandidatesFor('professor', 'casual_request', 'ida')).toBeNull()
    expect(templateCandidatesFor('senior', 'express_feelings', 'yongyong')).toBeNull()
    expect(templateCandidatesFor('friend', 'contribution_check', 'seumnida')).toBeNull()
  })

  it('부탁 카드만 명시적 자리 표시자를 쓰고 사과 카드는 답장 지연을 밝힌다', () => {
    const placeholderTexts: string[] = []
    const apologizeTexts: string[] = []

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []

          for (const candidate of candidates) {
            if (candidate.text.includes('[')) placeholderTexts.push(candidate.text)
            if (situationId === 'apologize') apologizeTexts.push(candidate.text)
          }
        }
      }
    }

    expect(placeholderTexts).toHaveLength(48)
    expect(placeholderTexts.every((text) => text.includes('[부탁할 내용]'))).toBe(true)
    expect(apologizeTexts).toHaveLength(48)
    expect(apologizeTexts.every((text) => /답/.test(text) && /(미안|죄송)/.test(text))).toBe(true)
  })

  it('같은 조회는 런타임 어미 변환 없이 동일한 후보를 반환한다', () => {
    const first = templateCandidatesFor('professor', 'absence_inquiry', 'yongyong')
    const second = templateCandidatesFor('professor', 'absence_inquiry', 'yongyong')

    expect(second).toEqual(first)
    expect(first?.map((candidate) => candidate.text)).toEqual([
      '안녕하세용 결석하게 돼서 과제 제출 방법을 여쭤봐도 될까용?',
      '안녕하세용 결석하게 됐어용 괜찮으실 때 과제 제출 방법을 알려주실 수 있을까용?',
      '안녕하세용 결석하게 됐어용 과제 제출 방법이 어떻게 될까용?',
    ])
  })

  it('사용자 검토표 96행이 코드의 288문구와 일치한다', () => {
    const reviewDraft = readFileSync(
      resolve('harness/tasks/T25-situation-card-templates/speech-style-review-draft.md'),
      'utf8',
    )
    const reviewRows = reviewDraft.match(/^\| \d+ \|/gm) ?? []
    const allTexts: string[] = []

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []
          allTexts.push(...candidates.map((candidate) => candidate.text))
        }
      }
    }

    expect(reviewRows).toHaveLength(96)
    expect(allTexts).toHaveLength(288)
    for (const text of allTexts) {
      expect(reviewDraft, text).toContain(`| ${text} |`)
    }
  })

  it('카드에 없는 날짜·기한·사유·향후 약속과 하위 관계 호칭을 고정하지 않는다', () => {
    const inventedDetailPhrases = [
      '오늘 안으로',
      '내일까지',
      '이번 주',
      '다음부터',
      '앞으로는',
      '다음에',
      '바쁜 거',
      '바쁘신',
      '사정이 있어서',
      '부득이한 사정',
      '약속할게',
      '다시는',
    ]
    const hardCodedTitles = ['교수님', '조교님', '선배님']

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []

          for (const candidate of candidates) {
            const context = `${scenarioId}/${situationId}/${speechStyleId}/${candidate.toneLevel}`
            for (const phrase of [...inventedDetailPhrases, ...hardCodedTitles]) {
              expect(candidate.text, `${context}: ${phrase}`).not.toContain(phrase)
            }
          }
        }
      }
    }
  })

  it('조건부 사과 표현을 사용하지 않는다', () => {
    const conditionalApologies = ['다면 미안', '다면 죄송', '기다렸으면']

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []

          for (const candidate of candidates) {
            const context = `${scenarioId}/${situationId}/${speechStyleId}/${candidate.toneLevel}`
            for (const phrase of conditionalApologies) {
              expect(candidate.text, `${context}: ${phrase}`).not.toContain(phrase)
            }
          }
        }
      }
    }
  })

  it('288문구마다 선택한 개인 말투의 최소 표지가 존재한다', () => {
    const speechStyleMarkers: Record<SpeechStyleId, RegExp> = {
      seumnida: /(습니다|습니까|합니다|합니까|십니까|입니다|입니까)/,
      haeyo: /요(?:[.!?]|$)/,
      ida: /(다(?:[.!?]|$)|(까|어|래)\?)/,
      yongyong: /용/,
    }

    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []

          for (const candidate of candidates) {
            const context = `${scenarioId}/${situationId}/${speechStyleId}/${candidate.toneLevel}`
            expect(candidate.text, context).toMatch(speechStyleMarkers[speechStyleId])
          }
        }
      }
    }
  })

  it('96세트 모두 더 분명한 C가 더 부드러운 S보다 길지 않다', () => {
    for (const [scenarioId, situationIds] of Object.entries(scenarioSituations) as Array<
      [ScenarioId, SituationId[]]
    >) {
      for (const situationId of situationIds) {
        for (const speechStyleId of speechStyleIds) {
          const candidates = templateCandidatesFor(scenarioId, situationId, speechStyleId) ?? []
          const softText = candidates[1]?.text ?? ''
          const clearText = candidates[2]?.text ?? ''

          expect(
            clearText.length,
            `${scenarioId}/${situationId}/${speechStyleId}: C=${clearText} / S=${softText}`,
          ).toBeLessThanOrEqual(softText.length)
        }
      }
    }
  })
})
