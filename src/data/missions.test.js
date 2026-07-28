// 카탈로그 무결성 — check:ads가 coupangProducts.js를 지키는 것과 같은 방식으로,
// missions.js 데이터 자체의 규칙을 노드 레벨에서 강제한다.
import { describe, it, expect } from 'vitest'
import { MISSIONS, INFO_ONLY_TRIGGERS } from './missions.js'
import { DEFICIENCY_TARGET_KEYS } from '../lib/nutrition.js'

const VALID_TRIGGERS = new Set([...DEFICIENCY_TARGET_KEYS, 'sodium-exceeded', 'no-record', 'all-satisfied'])
// dietAnalysis.js §7과 동일한 규칙 — 질병 진단·치료 표현 금지.
const MEDICAL_CLAIM_PATTERN = /병\s*위험|치료|진단|예방|개선\s*보장/

describe('missions 카탈로그', () => {
  it('id가 서로 중복되지 않는다', () => {
    const ids = MISSIONS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('trigger는 4대 목표 영양소 키이거나 sodium-exceeded/no-record/all-satisfied 중 하나다', () => {
    expect(MISSIONS.every((m) => VALID_TRIGGERS.has(m.trigger))).toBe(true)
  })

  it('모든 trigger가 최소 1개 이상의 미션을 갖는다(빈 트리거로 selectMission이 null을 반환하지 않게)', () => {
    for (const trigger of VALID_TRIGGERS) {
      expect(MISSIONS.some((m) => m.trigger === trigger)).toBe(true)
    }
  })

  it('title/description이 비어 있지 않다', () => {
    expect(MISSIONS.every((m) => m.title?.trim() && m.description?.trim())).toBe(true)
  })

  it('질병 진단·치료 표현이 title/description 어디에도 없다', () => {
    const offenders = MISSIONS.filter((m) => MEDICAL_CLAIM_PATTERN.test(`${m.title} ${m.description}`))
    expect(offenders).toEqual([])
  })

  it('all-satisfied는 정보성(INFO_ONLY_TRIGGERS)으로 등록돼 있다', () => {
    expect(INFO_ONLY_TRIGGERS.has('all-satisfied')).toBe(true)
  })
})
