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

// ctx: { streakCurrent, level, totalClaimedQuestCount, countsByQuestId: Record<string, number> }
function evaluateBadge(badgeId, ctx) {
  switch (badgeId) {
    case 'streak-3':
      return (ctx.streakCurrent ?? 0) >= 3
    case 'streak-7':
      return (ctx.streakCurrent ?? 0) >= 7
    case 'streak-30':
      return (ctx.streakCurrent ?? 0) >= 30
    case 'level-10':
      return (ctx.level ?? 0) >= 10
    case 'level-30':
      return (ctx.level ?? 0) >= 30
    case 'level-100':
      return (ctx.level ?? 0) >= 100
    case 'quest-10':
      return (ctx.totalClaimedQuestCount ?? 0) >= 10
    case 'quest-50':
      return (ctx.totalClaimedQuestCount ?? 0) >= 50
    case 'nutrition-master':
      return (ctx.countsByQuestId?.['protein-80'] ?? 0) + (ctx.countsByQuestId?.['sodium-in-limit'] ?? 0) >= 20
    default:
      return false
  }
}

// 아직 unlockedIds에 없는데 조건을 만족한 뱃지들만 — 이번에 새로 딴 뱃지 목록(호출부가 dataStore.unlockBadge
// + playConfetti를 트리거하는 데 쓴다).
export function evaluateBadges(ctx, unlockedIds = []) {
  return BADGES.filter((badge) => !unlockedIds.includes(badge.id) && evaluateBadge(badge.id, ctx))
}

// 도감 화면용 — 조건 재평가 없이 저장된 unlockedIds만 신뢰한다.
export function getBadgeDex(unlockedIds = []) {
  return BADGES.map((badge) => ({ ...badge, unlocked: unlockedIds.includes(badge.id) }))
}
