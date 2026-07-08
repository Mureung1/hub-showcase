// 날짜별 식사 기록 저장(F6, localStorage 기반). 유저별로 분리해서 저장한다.
import { get, set } from './storage.js'

function storageKey(userId) {
  return `records:${userId}`
}

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getAllRecords(userId) {
  if (!userId) return {}
  return get(storageKey(userId), {})
}

export function getRecord(userId, dateKey) {
  return getAllRecords(userId)[dateKey] || null
}

export function saveRecord(userId, dateKey, record) {
  if (!userId) return
  const records = getAllRecords(userId)
  set(storageKey(userId), { ...records, [dateKey]: record })
}
