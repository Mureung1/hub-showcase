// MY 탭의 "오늘 물 섭취 · 영양제" 체크리스트 저장소. 기기별(localStorage) 저장 — 계정 이동 시
// 동기화되지 않는다(FR-20에서도 유지되는 의도적 설계). 진짜 알림이 아니라 앱을 열었을 때만
// 기록/확인되는 기능이라는 걸 UI 쪽에서 명확히 해야 한다(이 모듈은 저장만 담당).
//
// FR-20: 고정 8잔(예전 TARGET_GLASSES) 대신 체중(kg)×30ml + 활동량 보정 기반 개인별 mL 목표로
// 전환했다. 과거 {glasses,supplementTaken} 레코드는 소급 변환하지 않고, 읽을 때만 mL로 환산한다.
import { get, set } from './storage.js'

export const WATER_CUP_ML = 200 // "물 한 컵" 버튼 단위이자 레거시 glasses→ml 환산 계수
const DEFAULT_TARGET_ML = 1600 // 신체정보 없는 게스트 폴백(예전 8잔×200ml과 동일한 값)

// TDEE 활동량 계수(nutrition.js의 ACTIVITY_FACTORS, 1.3~1.7배)를 그대로 곱하면 물 목표가 비현실적으로
// 커진다 — 물 섭취 가이드라인은 통상 "활동량이 높으면 +300~500ml" 수준이라, 완만한 보너스 비율로
// 재정규화했다.
const WATER_ACTIVITY_BONUS_RATIO = { low: 0, moderate: 0.08, high: 0.15 }

export function getWaterTargetMl(weightKg, activity) {
  if (!(weightKg > 0)) return DEFAULT_TARGET_ML
  const bonus = WATER_ACTIVITY_BONUS_RATIO[activity] ?? 0
  return Math.round(weightKg * 30 * (1 + bonus))
}

function storageKey(userId, dateKey) {
  return `waterIntake:${userId}:${dateKey}`
}

// 레거시 {glasses} 레코드도 읽을 수 있도록, 저장된 값에 mlConsumed가 없으면 glasses*200으로 환산한다.
// entries(MY 탭 개편 — 물 기록 화면의 "오늘 기록" 목록·삭제용 개별 기록)는 예전 레코드엔 없으므로
// 없으면 빈 배열로 채운다(마이그레이션 불필요 — 그 날짜 이전 기록은 그냥 "몇 시에 마셨는지"가 없을 뿐
// mlConsumed 합계는 그대로 유효하다).
export function getWaterIntake(userId, dateKey) {
  const raw = get(storageKey(userId, dateKey), null)
  if (!raw) return { mlConsumed: 0, supplementTaken: false, entries: [] }
  if (typeof raw.mlConsumed === 'number') {
    return { mlConsumed: raw.mlConsumed, supplementTaken: Boolean(raw.supplementTaken), entries: raw.entries ?? [] }
  }
  return { mlConsumed: Math.round((raw.glasses ?? 0) * WATER_CUP_ML), supplementTaken: Boolean(raw.supplementTaken), entries: raw.entries ?? [] }
}

// deltaMl이 목표 상한에 걸려 일부만 반영되면(예: 남은 양이 120ml인데 +200ml 시도) entries에는 실제로
// 반영된 양만 기록한다 — entries 합계가 항상 mlConsumed와 일치해야 "오늘 기록" 목록 삭제 시 정확히
// 그만큼만 차감할 수 있다. 반영된 양이 0이면(이미 목표 달성) 빈 기록을 남기지 않는다.
export function addMl(userId, dateKey, deltaMl, targetMl) {
  const current = getWaterIntake(userId, dateKey)
  const clamped = Math.max(0, Math.min(targetMl, Math.round(current.mlConsumed + deltaMl)))
  const appliedMl = clamped - current.mlConsumed
  const entries =
    appliedMl > 0
      ? [...current.entries, { id: `${Date.now()}-${current.entries.length}`, ml: appliedMl, at: Date.now() }]
      : current.entries
  const next = { ...current, mlConsumed: clamped, entries }
  set(storageKey(userId, dateKey), next)
  return next
}

// 물 기록 화면 "오늘 기록" 목록의 삭제 버튼용 — 해당 entry만 지우고 mlConsumed를 그만큼 차감한다.
export function removeEntry(userId, dateKey, entryId) {
  const current = getWaterIntake(userId, dateKey)
  const target = current.entries.find((e) => e.id === entryId)
  if (!target) return current
  const entries = current.entries.filter((e) => e.id !== entryId)
  const mlConsumed = Math.max(0, current.mlConsumed - target.ml)
  const next = { ...current, mlConsumed, entries }
  set(storageKey(userId, dateKey), next)
  return next
}

export function toggleSupplement(userId, dateKey) {
  const current = getWaterIntake(userId, dateKey)
  const next = { ...current, supplementTaken: !current.supplementTaken }
  set(storageKey(userId, dateKey), next)
  return next
}
