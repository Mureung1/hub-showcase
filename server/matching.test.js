import { test, expect } from 'vitest'
import { passesGenderFilter, sortByArrivalPriority, describeActivity } from './matching.js'

test('둘 다 genderOnly가 false면 성별이 달라도 보여준다', () => {
  const me = { gender: 'female', genderOnly: false }
  const candidate = { gender: 'male', genderOnly: false }
  expect(passesGenderFilter(me, candidate)).toBe(true)
})

test('나만 genderOnly고 성별이 같으면 보여준다', () => {
  const me = { gender: 'female', genderOnly: true }
  const candidate = { gender: 'female', genderOnly: false }
  expect(passesGenderFilter(me, candidate)).toBe(true)
})

test('나만 genderOnly고 성별이 다르면 숨긴다', () => {
  const me = { gender: 'female', genderOnly: true }
  const candidate = { gender: 'male', genderOnly: false }
  expect(passesGenderFilter(me, candidate)).toBe(false)
})

test('후보만 genderOnly고 성별이 다르면 숨긴다', () => {
  const me = { gender: 'female', genderOnly: false }
  const candidate = { gender: 'male', genderOnly: true }
  expect(passesGenderFilter(me, candidate)).toBe(false)
})

test('둘 다 genderOnly고 성별이 같으면 보여준다', () => {
  const me = { gender: 'male', genderOnly: true }
  const candidate = { gender: 'male', genderOnly: true }
  expect(passesGenderFilter(me, candidate)).toBe(true)
})

test('내 성별이 unknown이고 내가 genderOnly면 숨긴다', () => {
  const me = { gender: 'unknown', genderOnly: true }
  const candidate = { gender: 'male', genderOnly: false }
  expect(passesGenderFilter(me, candidate)).toBe(false)
})

test('후보 성별이 unknown이고 후보가 genderOnly면 숨긴다', () => {
  const me = { gender: 'male', genderOnly: false }
  const candidate = { gender: 'unknown', genderOnly: true }
  expect(passesGenderFilter(me, candidate)).toBe(false)
})

test('도착 소요시간이 짧은 순서로 정렬한다', () => {
  const rows = [
    { id: 'a', arrival_estimate: '15분 이내' },
    { id: 'b', arrival_estimate: '5분 이내' },
    { id: 'c', arrival_estimate: '10분 이내' },
  ]
  expect(sortByArrivalPriority(rows).map((r) => r.id)).toEqual(['b', 'c', 'a'])
})

test('도착 소요시간이 없는 행은 맨 뒤로 보낸다', () => {
  const rows = [
    { id: 'a', arrival_estimate: null },
    { id: 'b', arrival_estimate: '10분 이내' },
  ]
  expect(sortByArrivalPriority(rows).map((r) => r.id)).toEqual(['b', 'a'])
})

test('이미 정렬돼 있으면 그대로 유지한다', () => {
  const rows = [
    { id: 'a', arrival_estimate: '5분 이내' },
    { id: 'b', arrival_estimate: '10분 이내' },
  ]
  expect(sortByArrivalPriority(rows).map((r) => r.id)).toEqual(['a', 'b'])
})

test('원본 배열을 변경하지 않는다', () => {
  const rows = [
    { id: 'a', arrival_estimate: '15분 이내' },
    { id: 'b', arrival_estimate: '5분 이내' },
  ]
  sortByArrivalPriority(rows)
  expect(rows.map((r) => r.id)).toEqual(['a', 'b'])
})

const NOW = new Date('2026-07-23T12:00:00Z')

test('방금(0분 전)이면 활동중이다', () => {
  const lastSeenAt = new Date('2026-07-23T12:00:00Z').toISOString()
  expect(describeActivity(lastSeenAt, NOW)).toEqual({ isActive: true, label: '활동중' })
})

test('1분 전이면 활동중이다', () => {
  const lastSeenAt = new Date('2026-07-23T11:59:00Z').toISOString()
  expect(describeActivity(lastSeenAt, NOW)).toEqual({ isActive: true, label: '활동중' })
})

test('경계값 2분 전이면 활동중이다', () => {
  const lastSeenAt = new Date('2026-07-23T11:58:00Z').toISOString()
  expect(describeActivity(lastSeenAt, NOW)).toEqual({ isActive: true, label: '활동중' })
})

test('3분 전이면 활동중이 아니고 경과 시간을 보여준다', () => {
  const lastSeenAt = new Date('2026-07-23T11:57:00Z').toISOString()
  expect(describeActivity(lastSeenAt, NOW)).toEqual({ isActive: false, label: '3분 전 활동' })
})

test('61분 전이면 61분 전 활동이라고 보여준다', () => {
  const lastSeenAt = new Date('2026-07-23T10:59:00Z').toISOString()
  expect(describeActivity(lastSeenAt, NOW)).toEqual({ isActive: false, label: '61분 전 활동' })
})

test('활동 기록이 없으면 활동 정보 없음이다', () => {
  expect(describeActivity(null, NOW)).toEqual({ isActive: false, label: '활동 정보 없음' })
})
