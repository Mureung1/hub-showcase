// 분석 기록이 없는 날에 사용자가 직접 고른 하루 영양 상태 저장.
// 키: cjmt:daystatus:<userId>:<YYYY-MM-DD>, 값: { status: 'good'|'normal'|'bad', source: 'manual', updatedAt }
// (기록이 있는 날의 자동 판정은 저장하지 않고 매번 계산한다 — source 구분은 이 파일의 'manual'로만 명시된다.)
import { get, set } from './storage.js'

const VALID_STATUSES = ['good', 'normal', 'bad']

function storageKey(userId, dateKey) {
  return `daystatus:${userId}:${dateKey}`
}

export function getManualDayStatus(userId, dateKey) {
  if (!userId || !dateKey) return null
  const value = get(storageKey(userId, dateKey), null)
  return value && VALID_STATUSES.includes(value.status) ? value : null
}

export function setManualDayStatus(userId, dateKey, status) {
  if (!userId || !dateKey || !VALID_STATUSES.includes(status)) return
  set(storageKey(userId, dateKey), { status, source: 'manual', updatedAt: new Date().toISOString() })
}
