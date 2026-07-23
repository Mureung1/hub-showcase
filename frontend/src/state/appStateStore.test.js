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

test('waitSecs가 1일 때 TICK을 받으면 0이 되고 phase가 arrived로 바뀐다', () => {
  const state = { ...initialState, phase: 'waiting', waitSecs: 1 }
  const next = reducer(state, { type: 'TICK' })
  expect(next.waitSecs).toBe(0)
  expect(next.phase).toBe('arrived')
})

test('START_WAITING은 편지 관련 필드를 비우고 24h 대기를 시작한다', () => {
  const state = {
    ...initialState,
    letter: '작성 중인 편지',
    title: '제목',
    envelope: 'basic',
    showArrived: true,
    tab: 'received', // 편지와 무관한 필드는 그대로 유지되는지 확인
  }
  const next = reducer(state, { type: 'START_WAITING' })
  expect(next.letter).toBe('')
  expect(next.title).toBe('')
  expect(next.envelope).toBe(null)
  expect(next.showArrived).toBe(false)
  expect(next.phase).toBe('waiting')
  expect(next.waitSecs).toBe(initialState.waitSecs)
  expect(next.tab).toBe('received')
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
})

test('정의되지 않은 액션 타입이면 state를 그대로 반환한다', () => {
  const state = { ...initialState }
  expect(reducer(state, { type: 'UNKNOWN_ACTION' })).toBe(state)
})
