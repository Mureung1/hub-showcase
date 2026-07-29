// 오늘의 미션 선택/판정(트랙 1 §2) — 순수 함수만 있고 저장소가 없다. 미션 완료 여부는 매 렌더마다
// todayMealsTotal에서 다시 계산되는 파생값이라, 이력을 저장할 테이블이나 스키마 변경이 필요 없다.
import { INFO_ONLY_TRIGGERS, MISSIONS } from '../data/missions.js'
import { hashString } from './hashString.js'
import { isMet } from './nutrientCriteria.js'
import { buildDeficiencyRows, isSodiumExceeded, NUTRIENT_SATISFY_RATIO } from './nutrition.js'

const MISSIONS_BY_TRIGGER = MISSIONS.reduce((map, mission) => {
  ;(map[mission.trigger] ??= []).push(mission)
  return map
}, {})

// trigger 하나에 등록된 미션 중 (userId, dateKey) 기준으로 결정적으로 하나를 고른다.
function selectMission(trigger, dateKey, userId) {
  const pool = MISSIONS_BY_TRIGGER[trigger]
  if (!pool || pool.length === 0) return null
  const index = hashString(`${userId}:${dateKey}:${trigger}`) % pool.length
  return pool[index]
}

// recommended/todayTotal: nutrition.js의 NutrientSet. mealCount: 오늘 저장된 끼니 수(0이면 아직
// 기록 없음). dateKey: 'YYYY-MM-DD'(records.js의 toDateKey). userId: effectiveUserId — 게스트도
// dataStore.GUEST_ID로 항상 값이 있어 게스트에서도 동작한다.
//
// 우선순위: ①recommended 자체가 없으면(성별조차 안 고른 게스트) null — 호출부가 미션 카드 대신
// SexPromptCard로 유도해야 하므로 여기서 억지로 미션을 만들지 않는다 ②오늘 기록이 아예 없으면 첫
// 기록 유도 ③4대 목표 영양소 중 가장 부족한 것 ④나트륨 상한 초과 ⑤전부 충족(정보성).
// (안정성 점검(Phase B) — 예전엔 이 주석이 "권장량이 없어도 첫 기록 유도 문구로 폴백한다"고 썼지만
// 실제 코드는 그 경우 null을 반환한다. 코드가 아니라 이 주석이 낡아 있던 것이라 실제 동작에 맞게 고쳤다.)
export function pickDailyMission(recommended, todayTotal, { dateKey, userId = 'guest', mealCount = 0 } = {}) {
  if (!recommended) return null
  if (mealCount === 0 || !todayTotal) return selectMission('no-record', dateKey, userId)

  const [worst] = buildDeficiencyRows(recommended, todayTotal, { max: 1 })
  if (worst) return selectMission(worst.key, dateKey, userId)

  if (isSodiumExceeded(recommended, todayTotal)) return selectMission('sodium-exceeded', dateKey, userId)

  return selectMission('all-satisfied', dateKey, userId)
}

// 완료 여부: 'protein'/'fiber'/'carbs'/'fat'는 nutrientCriteria.isMet(목표형, 0.8 이상 충족)과 동일한
// 기준을 그대로 재사용한다 — 식단 탭·달력이 "충족"이라 부르는 기준과 미션이 서로 다른 말을 하면 안 된다.
// 'sodium-exceeded'는 반대로 한도형(isMet이 <= 판정)이라 같은 함수를 그대로 쓸 수 있다.
// 'no-record'는 영양소가 아니라 저장 여부라 mealCount로 판정한다.
// 'all-satisfied'(정보성)는 완료·미완료 개념이 없어 null을 반환한다 — 호출부는 체크 표시를 그리지 않는다.
export function evaluateMission(mission, todayTotal, recommended, { mealCount = 0 } = {}) {
  if (!mission) return null
  if (INFO_ONLY_TRIGGERS.has(mission.trigger)) return null
  if (mission.trigger === 'no-record') return mealCount > 0
  if (mission.trigger === 'sodium-exceeded') {
    return isMet('sodium', todayTotal?.sodium, recommended?.sodium)
  }
  return isMet(mission.trigger, todayTotal?.[mission.trigger], recommended?.[mission.trigger], NUTRIENT_SATISFY_RATIO)
}
