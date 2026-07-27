// AI 식습관 분석 결과의 당일 캐시(PRD 4주차 FR-3.3) — 화면에 "다시 분석" 버튼을 두지 않는 대신,
// 같은 기간 옵션에 대한 분석은 하루 1회만 실제 호출하고 이후 재방문·재클릭은 이 캐시만 보여준다.
// 무효화는 자연 조건만 일어난다: 날짜가 바뀌면(cached.date !== 오늘) 자동으로 안 보여주고, 기간
// 옵션(7↔30일)을 바꾸면 키 자체가 달라 자동으로 분리된다 — 그 외엔 재호출 수단이 없다.
import { get, set } from './storage.js'

function cacheKey(userId, periodDays) {
  return `dietAnalysis:${userId}:${periodDays}`
}

// userId/periodDays에 대한 "오늘자" 캐시만 반환한다. 어제 이전 캐시는 date가 달라 null로 떨어진다.
export function getTodayDietAnalysis(userId, periodDays, todayKey) {
  const cached = get(cacheKey(userId, periodDays), null)
  if (!cached || cached.date !== todayKey) return null
  return cached
}

export function saveDietAnalysis(userId, periodDays, todayKey, { text, startDate, endDate, recordedDays, analyzedAt }) {
  const entry = { date: todayKey, text, startDate, endDate, recordedDays, analyzedAt }
  set(cacheKey(userId, periodDays), entry)
  return entry
}

// "오늘 오전 9:12 분석" — 왜 새로 안 도는지(FR-3.3) 사용자가 납득하게 캐시 표시에 곁들이는 시각.
export function formatAnalyzedAt(isoString) {
  const d = new Date(isoString)
  if (Number.isNaN(d.getTime())) return ''
  const hours = d.getHours()
  const period = hours < 12 ? '오전' : '오후'
  const displayHour = hours % 12 === 0 ? 12 : hours % 12
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `오늘 ${period} ${displayHour}:${minutes} 분석`
}
