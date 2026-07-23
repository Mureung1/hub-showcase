// client/src/utils/gapList.js
// App.jsx에 인라인으로 있던 gap 메시지 생성 로직을 테스트 가능하도록 추출한 순수 함수.
// 동작은 원본과 동일하게 유지했다 (NaN 입력을 조용히 무시하는 등 기존 버그도 그대로).

/**
 * 목표 대비 부족한 학점과 미이수 배지를 문자열 메시지 목록으로 만든다.
 *
 * @param {Object} input
 * @param {number} input.goalTotal
 * @param {number} input.combinedTotal
 * @param {number} input.goalMajor
 * @param {number} input.combinedMajor
 * @param {number} input.goalGeneral
 * @param {number} input.combinedGeneral
 * @param {Array<{ label: string, done: boolean }>} input.badges
 * @returns {string[]}
 */
export function buildGapList({
  goalTotal,
  combinedTotal,
  goalMajor,
  combinedMajor,
  goalGeneral,
  combinedGeneral,
  badges,
}) {
  const gapList = [];

  const totalGap = goalTotal - combinedTotal;
  const majorGap = goalMajor - combinedMajor;
  const generalGap = goalGeneral - combinedGeneral;

  if (totalGap > 0) gapList.push(`총학점 ${totalGap}학점 부족`);
  if (majorGap > 0) gapList.push(`전공 ${majorGap}학점 부족`);
  if (generalGap > 0) gapList.push(`교양 ${generalGap}학점 부족`);

  badges.forEach((badge) => {
    if (!badge.done && badge.label !== '다중전공' && badge.label !== '해외학점') {
      gapList.push(`${badge.label} 미이수`);
    }
  });

  if (gapList.length === 0) gapList.push('모든 요건을 충족했어요 🎉');

  return gapList;
}
