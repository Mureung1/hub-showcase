/// <reference types="node" />

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  catAssistantAssets,
  catStageAssetPaths,
  dabnyangiAsset,
  emailSituationCards,
  emailToneLabels,
  scenarios,
  speechStyles,
  speechStylesFor,
  situationCardsFor,
  toneLabels,
} from './message'

describe('메시지 도메인 카탈로그', () => {
  it('네 관계에 각각 여섯 개의 상황 카드를 제공한다', () => {
    expect(scenarios).toHaveLength(4)

    for (const scenario of scenarios) {
      expect(situationCardsFor(scenario.id)).toHaveLength(6)
      expect(situationCardsFor(scenario.id)).toContainEqual({ id: 'apologize', label: '답장이 늦었을 때 사과' })
    }
  })

  it('결과 후보의 공통 톤 순서를 고정한다', () => {
    expect(toneLabels).toEqual({
      1: '기본',
      2: '더 부드럽게',
      3: '더 분명하게',
    })
  })

  it('교수 이메일 전용 여섯 상황과 세 결과 라벨을 고정한다', () => {
    expect(emailSituationCards).toEqual([
      { id: 'meeting_request', label: '면담 요청' },
      { id: 'course_question', label: '수업·과제 질문' },
      { id: 'absence_notice', label: '결석 문의' },
      { id: 'deadline_extension', label: '기한 조정 요청' },
      { id: 'recommendation_request', label: '추천·자문 요청' },
      { id: 'thanks_followup', label: '감사·후속 연락' },
    ])
    expect(emailToneLabels).toEqual({
      1: '정석',
      2: '더 정중하게',
      3: '더 간결하게',
    })
  })

  it('개인 말투 이름을 고정하고 네 관계에 모두 제공한다', () => {
    expect(speechStyles).toEqual([
      { id: 'seumnida', label: '습니다체', example: '확인했습니다. 감사합니다.' },
      { id: 'haeyo', label: '요체', example: '확인했어요, 고마워요.' },
      { id: 'ida', label: '이다체', example: '확인했다. 고맙다.' },
      { id: 'yongyong', label: '용용체', example: '확인했어용 고마워용' },
    ])
    for (const scenario of scenarios) {
      expect(speechStylesFor(scenario.id)).toEqual(speechStyles)
    }
  })

  it('네 관계의 정적 아바타와 브랜드 스테이지 에셋 경로를 제공한다', () => {
    for (const scenario of scenarios) {
      expect(catAssistantAssets[scenario.id].assetPath).toMatch(/^\/cats\/.+\.webp$/)
      expect(catStageAssetPaths[scenario.id]).toMatch(/^\/cats\/.+\.webp$/)
    }
  })

  it('런타임이 참조하는 냥이 WebP가 public 경로에 존재한다', () => {
    const assetPaths = [
      dabnyangiAsset.assetPath,
      '/cats/dabnyangi-thinking.webp',
      ...Object.values(catAssistantAssets).map((asset) => asset.assetPath),
      ...Object.values(catStageAssetPaths),
    ]

    for (const assetPath of assetPaths) {
      expect(assetPath).not.toBeNull()
      if (assetPath) {
        expect(existsSync(resolve('public', assetPath.slice(1))), assetPath).toBe(true)
      }
    }
  })
})
