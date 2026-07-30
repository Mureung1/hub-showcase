// appStateStore의 reducer 단위 테스트.
// 이미 구현된 로직에 테스트를 붙이는 케이스라 red 없이 바로 통과를 확인한다.
import { test, expect } from 'vitest'
import { reducer, initialState } from './appStateStore'

test('phase가 waiting이 아니면 TICK을 무시하고 그대로 반환한다', () => {
  const state = { ...initialState, phase: 'idle', waitSecs: 10 }
  expect(reducer(state, { type: 'TICK' })).toBe(state)
})

test('TICK은 waiting 중 waitSecs를 1초 줄인다', () => {
  const state = { ...initialState, phase: 'waiting', waitSecs: 10 }
  const next = reducer(state, { type: 'TICK' })
  expect(next.waitSecs).toBe(9)
  expect(next.phase).toBe('waiting')
})

test('waitSecs가 1일 때 TICK을 받으면 0에서 멈추고 phase는 waiting을 유지한다 (도착 판정은 서버 폴링이 한다)', () => {
  const state = { ...initialState, phase: 'waiting', waitSecs: 1 }
  const next = reducer(state, { type: 'TICK' })
  expect(next.waitSecs).toBe(0)
  expect(next.phase).toBe('waiting')
})

test('waitSecs가 0일 때 TICK을 받아도 음수로 내려가지 않는다', () => {
  const state = { ...initialState, phase: 'waiting', waitSecs: 0 }
  const next = reducer(state, { type: 'TICK' })
  expect(next.waitSecs).toBe(0)
})

test('RECOMMENDATION_ARRIVED는 phase를 arrived로 바꾸고 추천 데이터를 저장한다', () => {
  const state = { ...initialState, phase: 'waiting' }
  const recommendation = { has_match: true, match_id: 'm1' }
  const next = reducer(state, { type: 'RECOMMENDATION_ARRIVED', value: recommendation })
  expect(next.phase).toBe('arrived')
  expect(next.recommendation).toBe(recommendation)
})

test('SET_CURRENT_LETTER_ID는 currentLetterId를 저장한다', () => {
  const next = reducer(initialState, { type: 'SET_CURRENT_LETTER_ID', value: 'letter-1' })
  expect(next.currentLetterId).toBe('letter-1')
})

test('START_WAITING은 편지 관련 필드를 비우고 24h 대기를 시작한다', () => {
  const state = {
    ...initialState,
    letter: '작성 중인 편지',
    title: '제목',
    envelope: 'basic',
    showArrived: true,
    tab: 'linked', // 편지와 무관한 필드는 그대로 유지되는지 확인
  }
  const next = reducer(state, { type: 'START_WAITING' })
  expect(next.letter).toBe('')
  expect(next.title).toBe('')
  expect(next.envelope).toBe(null)
  expect(next.showArrived).toBe(false)
  expect(next.phase).toBe('waiting')
  expect(next.waitSecs).toBe(initialState.waitSecs)
  expect(next.tab).toBe('linked')
})

test('RESET_AFTER_SEND는 답장/피드백 상태까지 포함해 작성 화면을 초기화한다', () => {
  const state = {
    ...initialState,
    letter: '답장',
    title: '제목',
    envelope: 'wax',
    replying: true,
    showFeedback: true,
    feedback: '좋았어요',
    phase: 'arrived',
    tab: 'linked', // 무관한 필드 유지 확인
    currentLetterId: 'letter-1',
    recommendation: { has_match: true },
    replyTargetMatchId: 'm1',
    replyTargetLetterId: 'l1',
  }
  const next = reducer(state, { type: 'RESET_AFTER_SEND' })
  expect(next.letter).toBe('')
  expect(next.title).toBe('')
  expect(next.envelope).toBe(null)
  expect(next.replying).toBe(false)
  expect(next.showFeedback).toBe(false)
  expect(next.feedback).toBe('')
  expect(next.phase).toBe('idle')
  expect(next.waitSecs).toBe(initialState.waitSecs)
  expect(next.tab).toBe('linked')
  expect(next.currentLetterId).toBe(null)
  expect(next.recommendation).toBe(null)
  expect(next.replyTargetMatchId).toBe(null)
  expect(next.replyTargetLetterId).toBe(null)
})

test('RESTORE_PENDING_MATCH는 opened를 true로 만들고 phase를 arrived로, 추천 데이터를 복원한다', () => {
  const recommendation = { has_match: true, match_id: 'm1', matched_letter: { body: '본문' }, reason: '사유' }
  const next = reducer(initialState, { type: 'RESTORE_PENDING_MATCH', value: recommendation })
  expect(next.opened).toBe(true)
  expect(next.phase).toBe('arrived')
  expect(next.recommendation).toBe(recommendation)
})

test('RESTORE_WAITING은 phase를 waiting으로, currentLetterId/waitSecs를 서버 기준 값으로 복원한다', () => {
  const next = reducer(initialState, { type: 'RESTORE_WAITING', currentLetterId: 'letter-1', waitSecs: 3600 })
  expect(next.phase).toBe('waiting')
  expect(next.currentLetterId).toBe('letter-1')
  expect(next.waitSecs).toBe(3600)
})

test('START_REPLY는 matchId를 채우고 letterId는 비워 서로 배타적으로 유지한다', () => {
  const state = { ...initialState, replyTargetLetterId: 'l1' }
  const next = reducer(state, { type: 'START_REPLY', matchId: 'm1' })
  expect(next.replying).toBe(true)
  expect(next.replyTargetMatchId).toBe('m1')
  expect(next.replyTargetLetterId).toBe(null)
})

test('START_REPLY_THREAD는 letterId를 채우고 matchId는 비워 서로 배타적으로 유지한다', () => {
  const state = { ...initialState, replyTargetMatchId: 'm1' }
  const next = reducer(state, { type: 'START_REPLY_THREAD', letterId: 'l1' })
  expect(next.replying).toBe(true)
  expect(next.replyTargetLetterId).toBe('l1')
  expect(next.replyTargetMatchId).toBe(null)
})

test('CANCEL_REPLY는 두 답장 대상 필드를 모두 비운다', () => {
  const state = { ...initialState, replying: true, replyTargetMatchId: 'm1', replyTargetLetterId: 'l1' }
  const next = reducer(state, { type: 'CANCEL_REPLY' })
  expect(next.replying).toBe(false)
  expect(next.replyTargetMatchId).toBe(null)
  expect(next.replyTargetLetterId).toBe(null)
})

test('정의되지 않은 액션 타입이면 state를 그대로 반환한다', () => {
  const state = { ...initialState }
  expect(reducer(state, { type: 'UNKNOWN_ACTION' })).toBe(state)
})
