// server/src/utils/semesterPlan.js
// client/src/utils/semesterPlan.js의 서버(CommonJS)용 이식본.
// 원본은 프론트에서 즉시 계산하려고 client에만 뒀던 것인데, 챗봇이 tool로
// 호출하려면 서버에서도 같은 계산을 할 수 있어야 해서 옮겨왔다.
// 로직을 바꾸면 client/src/utils/semesterPlan.js도 함께 맞춰줄 것.

const SEMESTER_ORDER = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
const LAST_SEMESTER_INDEX = SEMESTER_ORDER.length; // 8
const WARNING_THRESHOLD = 21;

function emptyResult(error) {
  return {
    remainingSemesters: 0,
    perSemester: {
      total: { needed: 0, warning: false },
      major: { needed: 0, warning: false },
      general: { needed: 0, warning: false },
      other: { needed: 0 },
    },
    error,
  };
}

function neededPerSemester(goal, current, remainingSemesters) {
  return Math.max(0, Math.ceil((goal - current) / remainingSemesters));
}

/**
 * 남은 학기 동안 학기당 최소 이수 학점을 계산한다.
 *
 * @param {Object} input
 * @param {string} input.currentSemester - "1-1"~"4-2" 형식
 * @param {number} input.combinedTotal - 현재까지 이수 + 바구니 담은 총학점
 * @param {number} input.combinedMajor
 * @param {number} input.combinedGeneral
 * @param {number} input.goalTotal - 학과/트랙 기준 목표 총학점
 * @param {number} input.goalMajor
 * @param {number} input.goalGeneral
 * @returns {{ remainingSemesters: number, perSemester: Object, error: string|null }}
 */
function calculateSemesterPlan(input) {
  const {
    currentSemester,
    combinedTotal,
    combinedMajor,
    combinedGeneral,
    goalTotal,
    goalMajor,
    goalGeneral,
  } = input;

  const semesterIndex = SEMESTER_ORDER.indexOf(currentSemester) + 1;
  if (semesterIndex === 0) {
    return emptyResult(
      `currentSemester는 "1-1"~"4-2" 형식이어야 합니다: ${currentSemester}`
    );
  }

  const remainingSemesters = LAST_SEMESTER_INDEX - semesterIndex + 1;
  if (remainingSemesters <= 0) {
    return emptyResult('남은 학기가 없습니다.');
  }

  const totalNeeded = neededPerSemester(goalTotal, combinedTotal, remainingSemesters);
  const majorNeeded = neededPerSemester(goalMajor, combinedMajor, remainingSemesters);
  const generalNeeded = neededPerSemester(goalGeneral, combinedGeneral, remainingSemesters);
  const otherNeeded = Math.max(
    0,
    Math.ceil((goalTotal - goalMajor - goalGeneral) / remainingSemesters)
  );

  const warning = totalNeeded > WARNING_THRESHOLD;

  return {
    remainingSemesters,
    perSemester: {
      total: { needed: totalNeeded, warning },
      major: { needed: majorNeeded, warning },
      general: { needed: generalNeeded, warning },
      other: { needed: otherNeeded },
    },
    error: null,
  };
}

module.exports = { calculateSemesterPlan };
