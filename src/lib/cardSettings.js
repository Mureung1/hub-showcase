// "카드 표시 항목" 설정 — 영양 카드(NutrientBars)에 어떤 영양소를 보여줄지 on/off. 계정 데이터가
// 아니라 기기(브라우저) 단위 화면 설정이라 UserContext(계정별 상태)가 아니라 독립된 storage 키에
// 둔다. 게스트는 로그아웃할 때마다 새 guest id가 발급되므로(UserContext.makeGuestId), 계정별 키로
// 저장했다면 그때마다 이 설정이 초기화된다 — 계정과 무관한 전역 키가 "게스트도 유지"라는 요구사항에
// 오히려 더 맞는다.
import { useSyncExternalStore } from 'react'
import { get, set } from './storage.js'
import { NUTRIENT_LABELS } from './nutrition.js'

const STORAGE_KEY = 'cardSettings:nutrients'

function defaultVisible() {
  return Object.fromEntries(NUTRIENT_LABELS.map(({ key }) => [key, true]))
}

function readVisible() {
  const saved = get(STORAGE_KEY, null)
  if (!saved || typeof saved !== 'object') return defaultVisible()
  // 저장된 값에 없는 키(나중에 영양소가 추가되는 경우 등)는 기본값(true)으로 채운다.
  return { ...defaultVisible(), ...saved }
}

let cache = readVisible()
const listeners = new Set()

export function getVisibleNutrients() {
  return cache
}

export function setVisibleNutrients(next) {
  cache = { ...defaultVisible(), ...next }
  set(STORAGE_KEY, cache)
  listeners.forEach((fn) => fn())
}

export function toggleVisibleNutrient(key) {
  setVisibleNutrients({ ...cache, [key]: !cache[key] })
}

function subscribe(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

// 설정 화면과 카드가 서로 다른 컴포넌트 트리에 있어도, 설정이 바뀌는 즉시 모든 구독자가 같은 최신
// 값을 보게 하는 최소 pub-sub(useSyncExternalStore). NutrientBars와 설정 체크리스트가 같이 쓴다.
export function useVisibleNutrients() {
  return useSyncExternalStore(subscribe, getVisibleNutrients)
}
