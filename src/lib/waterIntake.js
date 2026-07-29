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
export function getWaterIntake(userId, dateKey) {
  const raw = get(storageKey(userId, dateKey), null)
  if (!raw) return { mlConsumed: 0, supplementTaken: false }
  if (typeof raw.mlConsumed === 'number') return { mlConsumed: raw.mlConsumed, supplementTaken: Boolean(raw.supplementTaken) }
  return { mlConsumed: Math.round((raw.glasses ?? 0) * WATER_CUP_ML), supplementTaken: Boolean(raw.supplementTaken) }
}

export function addMl(userId, dateKey, deltaMl, targetMl) {
  const current = getWaterIntake(userId, dateKey)
  const clamped = Math.max(0, Math.min(targetMl, Math.round(current.mlConsumed + deltaMl)))
  const next = { ...current, mlConsumed: clamped }
  set(storageKey(userId, dateKey), next)
  return next
}

export function toggleSupplement(userId, dateKey) {
  const current = getWaterIntake(userId, dateKey)
  const next = { ...current, supplementTaken: !current.supplementTaken }
  set(storageKey(userId, dateKey), next)
  return next
}
