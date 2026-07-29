// 뱃지 · 도감(FR-13) — 전부 이미 저장되는 데이터(스트릭/레벨/퀘스트 수령 이력)만으로 계산 가능한
// 조건만 담는다. "학식 영양왕"류(학식/급식 이용 자체를 상시 집계하는 저장소가 없음)는 새 스키마 없이
// 만들 수 있는 nutrition-master(영양 관리 퀘스트 누적 20회)로 같은 취지를 대체했다(PRD v2 확인 필요 ③).
//
// 조건은 "잠금해제 시점"만 판정한다 — 도감 화면 자체는 조건을 재평가하지 않고 저장된 unlockedIds만
// 신뢰한다(getBadgeDex). 그래야 스트릭이 끊기거나 레벨이 하락할 방법이 없는데도 조건 재평가로 이미 딴
// 뱃지가 사라지는 것 같은 혼란이 생기지 않는다.
export const BADGES = [
  { id: 'streak-3', title: '꾸준한 시작', description: '3일 연속으로 식사를 기록했어요.', icon: '🔥' },
  { id: 'streak-7', title: '일주일 개근', description: '7일 연속으로 식사를 기록했어요.', icon: '🏅' },
  { id: 'streak-30', title: '한 달 개근', description: '30일 연속으로 식사를 기록했어요.', icon: '🏆' },
  { id: 'level-10', title: '레벨 10 달성', description: '레벨 10에 도달했어요.', icon: '🥉' },
  { id: 'level-30', title: '레벨 30 달성', description: '레벨 30에 도달했어요.', icon: '🥈' },
  { id: 'level-100', title: '만렙 달성', description: '레벨 100(만렙)에 도달했어요.', icon: '👑' },
  { id: 'quest-10', title: '퀘스트 입문', description: '퀘스트를 10회 완료했어요.', icon: '🎯' },
  { id: 'quest-50', title: '퀘스트 마스터', description: '퀘스트를 50회 완료했어요.', icon: '🎖️' },
  { id: 'nutrition-master', title: '영양 관리왕', description: '단백질·나트륨 관리 퀘스트를 20회 완료했어요.', icon: '🥗' },
]

// 뱃지 하나당 "판정에 쓰는 값(metric)"과 "그 값의 목표치(target)"를 한 곳에만 적는다 — 잠금 조건
// (evaluateBadge: metric >= target)과 진행률(progressOf: {current: min(metric,target), target})이
// 예전엔 badgeId별 switch문 두 벌로 따로 있어서, 한쪽만 임계값을 바꾸면(예: streak-7을 5로 완화)
// 잠금은 5에서 걸리는데 진행률 바는 여전히 "5/7"로 보이는 드리프트가 날 수 있었다(questWeekContext.js
// 헤더 주석에 적힌 것과 같은 버그 클래스). 이제 값을 두 번 적을 데가 없다.
const BADGE_RULES = {
  'streak-3': { metric: (ctx) => ctx.streakCurrent ?? 0, target: 3 },
  'streak-7': { metric: (ctx) => ctx.streakCurrent ?? 0, target: 7 },
  'streak-30': { metric: (ctx) => ctx.streakCurrent ?? 0, target: 30 },
  'level-10': { metric: (ctx) => ctx.level ?? 0, target: 10 },
  'level-30': { metric: (ctx) => ctx.level ?? 0, target: 30 },
  'level-100': { metric: (ctx) => ctx.level ?? 0, target: 100 },
  'quest-10': { metric: (ctx) => ctx.totalClaimedQuestCount ?? 0, target: 10 },
  'quest-50': { metric: (ctx) => ctx.totalClaimedQuestCount ?? 0, target: 50 },
  'nutrition-master': {
    metric: (ctx) => (ctx.countsByQuestId?.['protein-80'] ?? 0) + (ctx.countsByQuestId?.['sodium-in-limit'] ?? 0),
    target: 20,
  },
}

// ctx: { streakCurrent, level, totalClaimedQuestCount, countsByQuestId: Record<string, number> }
function evaluateBadge(badgeId, ctx) {
  const rule = BADGE_RULES[badgeId]
  if (!rule) return false
  return rule.metric(ctx) >= rule.target
}

// 아직 unlockedIds에 없는데 조건을 만족한 뱃지들만 — 이번에 새로 딴 뱃지 목록(호출부가 dataStore.unlockBadge
// + playConfetti를 트리거하는 데 쓴다).
export function evaluateBadges(ctx, unlockedIds = []) {
  return BADGES.filter((badge) => !unlockedIds.includes(badge.id) && evaluateBadge(badge.id, ctx))
}

// MY 탭 개편(배지 도감 화면 "3/7일" 진행률) — BADGE_RULES의 같은 metric/target에서 그대로 유도한다
// (evaluateBadge와 임계값이 어긋날 수 없다). target을 넘는 current는 클램프해 진행 바가 100%를 넘지 않게 한다.
function progressOf(badgeId, ctx) {
  const rule = BADGE_RULES[badgeId]
  if (!rule) return { current: 0, target: 1 }
  return { current: Math.min(rule.metric(ctx), rule.target), target: rule.target }
}

// 도감 화면용 — 조건 재평가 없이 저장된 unlockedIds만 신뢰한다. 잠긴 뱃지에는 progress({current,target})를
// 붙여 "3/7일" 같은 진행률을 보여줄 수 있게 한다(해제된 뱃지는 굳이 재계산할 필요 없어 null).
export function getBadgeDex(unlockedIds = [], ctx = {}) {
  return BADGES.map((badge) => {
    const unlocked = unlockedIds.includes(badge.id)
    return { ...badge, unlocked, progress: unlocked ? null : progressOf(badge.id, ctx) }
  })
}
