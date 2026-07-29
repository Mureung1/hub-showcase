import { test, expect } from 'vitest'
import { passesGenderFilter, sortByArrivalPriority, describeActivity, classifyBoarding, isRoomStale, isOverdueForAutoRating, applyRating } from './matching.js'

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

const REFERENCE_DATE = new Date('2026-07-27T00:00:00Z')

test('정확히 약속 시간에 탑승확인하면 정상이다', () => {
  const boardedAt = new Date('2026-07-27T20:30:00Z')
  expect(classifyBoarding('20:30:00', REFERENCE_DATE, boardedAt)).toEqual({ status: 'on_time', minutesLate: 0 })
})

test('약속보다 일찍 탑승확인해도 정상이다 (지각 없음)', () => {
  const boardedAt = new Date('2026-07-27T20:27:00Z')
  expect(classifyBoarding('20:30:00', REFERENCE_DATE, boardedAt)).toEqual({ status: 'on_time', minutesLate: 0 })
})

test('경계값 5분 늦으면 아직 정상이다', () => {
  const boardedAt = new Date('2026-07-27T20:35:00Z')
  expect(classifyBoarding('20:30:00', REFERENCE_DATE, boardedAt)).toEqual({ status: 'on_time', minutesLate: 5 })
})

test('6분 늦으면 지각이다', () => {
  const boardedAt = new Date('2026-07-27T20:36:00Z')
  expect(classifyBoarding('20:30:00', REFERENCE_DATE, boardedAt)).toEqual({ status: 'late', minutesLate: 6 })
})

test('30분 늦으면 지각이고 늦은 분을 그대로 보여준다', () => {
  const boardedAt = new Date('2026-07-27T21:00:00Z')
  expect(classifyBoarding('20:30:00', REFERENCE_DATE, boardedAt)).toEqual({ status: 'late', minutesLate: 30 })
})

test('마지막 활동이 1시간 전이면 아직 안 오래됐다', () => {
  const lastSeenAt = new Date('2026-07-23T11:00:00Z').toISOString()
  expect(isRoomStale(lastSeenAt, NOW)).toBe(false)
})

test('경계값 정확히 2시간 전이면 아직 안 오래됐다', () => {
  const lastSeenAt = new Date('2026-07-23T10:00:00Z').toISOString()
  expect(isRoomStale(lastSeenAt, NOW)).toBe(false)
})

test('2시간 1분 전이면 오래된 방이다', () => {
  const lastSeenAt = new Date('2026-07-23T09:59:00Z').toISOString()
  expect(isRoomStale(lastSeenAt, NOW)).toBe(true)
})

test('활동 기록이 없으면 오래된 것으로 취급하지 않는다', () => {
  expect(isRoomStale(null, NOW)).toBe(false)
})

test('기준 시간을 직접 지정할 수 있다', () => {
  const lastSeenAt = new Date('2026-07-23T11:50:00Z').toISOString() // 10분 전
  expect(isRoomStale(lastSeenAt, NOW, 5)).toBe(true)
  expect(isRoomStale(lastSeenAt, NOW, 15)).toBe(false)
})

test('탑승 30분 후면 아직 자동 평가 대상이 아니다', () => {
  const boardedAt = new Date('2026-07-23T11:30:00Z').toISOString()
  expect(isOverdueForAutoRating(boardedAt, NOW)).toBe(false)
})

test('경계값 탑승 정확히 1시간 후면 아직 자동 평가 대상이 아니다', () => {
  const boardedAt = new Date('2026-07-23T11:00:00Z').toISOString()
  expect(isOverdueForAutoRating(boardedAt, NOW)).toBe(false)
})

test('탑승 1시간 1분 후면 자동 평가 대상이다', () => {
  const boardedAt = new Date('2026-07-23T10:59:00Z').toISOString()
  expect(isOverdueForAutoRating(boardedAt, NOW)).toBe(true)
})

test('탑승 기록이 없으면 자동 평가 대상이 아니다', () => {
  expect(isOverdueForAutoRating(null, NOW)).toBe(false)
})

test('첫 평점은 이전 평점을 무시하고 새 값 그대로다', () => {
  expect(applyRating(5, 0, 3)).toEqual({ rating: 3, count: 1 })
})

test('기존 평점에 새 평점을 더해 평균을 낸다', () => {
  expect(applyRating(4, 1, 5)).toEqual({ rating: 4.5, count: 2 })
})

test('여러 번 누적되면 가중 평균이 된다', () => {
  expect(applyRating(4, 3, 5)).toEqual({ rating: 4.3, count: 4 })
})

test('낮은 평점(노쇼 등)이 들어오면 평균이 내려간다', () => {
  expect(applyRating(5, 2, 1)).toEqual({ rating: 3.7, count: 3 })
})
