import { describe, expect, it } from 'vitest'
import { countResponded, getSelectedSlotIds, isResponded } from './participantStatus.js'

describe('isResponded', () => {
  // 1. 정상 케이스 — 실제 API가 주는 형태(단일 객체). 어제 버그의 핵심 회귀 케이스:
  // .length 같은 배열 전제 로직으로 되돌아가면 이 케이스가 깨진다.
  it('단일 객체(실제 API 형태)면 응답 완료로 판별한다', () => {
    expect(isResponded({ responses: { selected_slot_ids: ['slot1'], selected_location_ids: ['loc1'] } })).toBe(true)
  })

  // 2. 정상 케이스 — 아직 응답 안 한 참여자(DB에 매칭 행 없음)
  it('null이면 응답 대기로 판별한다', () => {
    expect(isResponded({ responses: null })).toBe(false)
  })

  // 3. 빈 값 케이스 — 필드 자체가 없는 경우도 null과 동일하게 취급되는지
  it('responses 필드가 없으면(undefined) 응답 대기로 판별한다', () => {
    expect(isResponded({})).toBe(false)
  })

  // 4. 경계값 — 빈 배열. 실제 API는 이 값을 절대 주지 않는다(참여자↔응답은 1:1이라
  // 응답이 없으면 null, 있으면 단일 객체만 온다). 방어 코드를 새로 넣지 않고
  // 현재 로직이 실제로 반환하는 값을 있는 그대로 기록만 한다.
  it('[REGRESSION-RISK] 빈 배열이면(실제로는 오지 않는 값) 응답 완료로 판별된다', () => {
    expect(isResponded({ responses: [] })).toBe(true)
  })

  // 5. 경계값 — 내용 없는 빈 객체. 판별은 응답 완료이지만 슬롯 id는 안전하게 빈 배열로 폴백되어야 한다.
  it('내용 없는 빈 객체면 응답 완료로 판별하고, 슬롯 id는 빈 배열로 폴백한다', () => {
    expect(isResponded({ responses: {} })).toBe(true)
    expect(getSelectedSlotIds({ responses: {} })).toEqual([])
  })

  // 7. 실패(회귀 방지) 케이스 — 단일 객체엔 .length 프로퍼티가 없다는 걸 이용해,
  // 배열 전제 로직(예: p.responses?.length > 0)으로 되돌아가면 실패하도록 한다.
  it('단일 객체는 .length가 없어도 응답 완료로 판별한다 (배열 전제 로직 회귀 방지)', () => {
    const responded = { responses: { selected_slot_ids: ['slot1'] } }
    expect(responded.responses.length).toBeUndefined()
    expect(isResponded(responded)).toBe(true)
  })

  // 8. 참고용 — 관계가 1:N으로 바뀌는 미래 시나리오. 실제 API는 이 값을 주지 않는다.
  // 방어 코드 없이, "null이 아니면 응답 완료"라는 현재 로직 그대로의 결과만 기록한다.
  it('[FUTURE-SHAPE] 데이터 있는 배열이면(실제로는 오지 않는 값) 응답 완료로 판별된다', () => {
    expect(isResponded({ responses: [{ selected_slot_ids: ['slot1'] }] })).toBe(true)
  })
})

describe('countResponded', () => {
  // 6. 단일 객체/null/undefined가 섞인 참여자 배열에서 집계가 정확한지
  it('단일 객체/null/undefined가 섞여도 응답 완료 인원만 정확히 센다', () => {
    const participants = [
      { name: '민준', responses: { selected_slot_ids: ['slot1'] } },
      { name: '서연', responses: null },
      { name: '지호' }, // responses 필드 없음
      { name: '하은', responses: { selected_slot_ids: ['slot2'] } },
    ]
    expect(countResponded(participants)).toBe(2)
  })

  it('참여자가 없으면 0을 반환한다', () => {
    expect(countResponded([])).toBe(0)
  })
})

describe('getSelectedSlotIds', () => {
  it('null이면 빈 배열을 반환한다', () => {
    expect(getSelectedSlotIds({ responses: null })).toEqual([])
  })

  it('단일 객체면 selected_slot_ids를 그대로 반환한다', () => {
    expect(getSelectedSlotIds({ responses: { selected_slot_ids: ['slot1', 'slot2'] } })).toEqual(['slot1', 'slot2'])
  })
})
