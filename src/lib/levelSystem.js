// 듀오링고식 레벨/경험치(XP) 순수 계산 — 저장은 total_xp(누적 총 XP) 하나만 하고, 레벨/진행률은
// 항상 이 모듈로 다시 계산한다(nutritionScore.js류 "단일 소스" 원칙과 동일 — SQL에 공식을 복제하지
// 않는다. 랭킹을 추가하게 되면 total_xp 정렬만으로 충분하다, 레벨 자체가 total_xp의 단조증가 함수라서).
export const MAX_LEVEL = 100

// level(1~99) -> 그 레벨에서 다음 레벨로 가는 데 필요한 XP. "1->2레벨 10pt, 이후 레벨마다 이전
// 요구량보다 10pt씩 증가"(요청 원문) = level * 10.
export function xpRequiredForLevel(level) {
  return level * 10
}

// 레벨 1(0 XP)에서 레벨 100(만렙)까지 도달하는 데 필요한 누적 총 XP = sum_{l=1}^{99} 10l = 49500.
export const MAX_TOTAL_XP = (() => {
  let sum = 0
  for (let level = 1; level < MAX_LEVEL; level++) sum += xpRequiredForLevel(level)
  return sum
})()

// totalXp -> 진행 상태. 음수/소수/상한 초과는 클램프해 항상 유효한 값을 돌려준다(저장된 값이
// 손상되어도 화면이 깨지지 않도록).
export function getLevelProgress(totalXp) {
  const safeXp = Number.isFinite(totalXp) ? totalXp : 0
  const clamped = Math.max(0, Math.min(Math.floor(safeXp), MAX_TOTAL_XP))

  let level = 1
  let cumulative = 0
  while (level < MAX_LEVEL) {
    const need = xpRequiredForLevel(level)
    if (cumulative + need > clamped) break
    cumulative += need
    level++
  }

  const isMaxLevel = level >= MAX_LEVEL
  return {
    level,
    xpIntoLevel: clamped - cumulative,
    xpForNextLevel: isMaxLevel ? null : xpRequiredForLevel(level),
    totalXp: clamped,
    isMaxLevel,
  }
}

// 연속 기록 보너스(요청 원문: "연속 기록 시 획득 경험치량 10% 증가") — streakCurrent가 thresholdDays
// (어제도 기록해 오늘이 최소 2일째 연속) 이상일 때만 10% 가산 후 반올림한다.
export function applyStreakBonus(baseXp, streakCurrent, { thresholdDays = 2, bonusRate = 0.1 } = {}) {
  if (!Number.isFinite(baseXp) || baseXp <= 0) return 0
  if (!Number.isFinite(streakCurrent) || streakCurrent < thresholdDays) return baseXp
  return Math.round(baseXp * (1 + bonusRate))
}
