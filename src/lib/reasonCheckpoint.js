// @ts-check

/**
 * 회피 이유 재확인 체크포인트를 이번 레벨업에서 띄울지 판정하는 순수 함수.
 * 레벨이 1 또는 3으로 "처음" 오른 순간에만, 그리고 그 레벨을 이 task에서 아직
 * 띄운 적 없을 때만 해당 레벨을 반환한다(레벨별 1회 = 할일당 최대 2회).
 * 멈추기로 레벨이 내려갔다가 같은 레벨을 재진입해도 checkedLevels에 이미 있으면
 * null을 반환해 중복 노출을 막는다.
 *
 * @param {Set<number>} checkedLevels - 이 task에서 이미 재확인을 띄운 레벨 집합
 * @param {boolean} leveledUp - 이번 tick에서 레벨이 실제로 올랐는지
 * @param {number} level - 오른 뒤의 현재 레벨
 * @returns {1 | 3 | null}
 */
export function pickCheckpointLevel(checkedLevels, leveledUp, level) {
  if (!leveledUp) return null;
  if (level !== 1 && level !== 3) return null;
  if (checkedLevels.has(level)) return null;
  return level;
}
