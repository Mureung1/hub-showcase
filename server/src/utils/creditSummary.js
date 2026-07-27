// server/src/utils/creditSummary.js
// client/src/App.jsx에 인라인으로 있던 총학점/전공/교양 부족분 계산 로직
// (combinedTotal, totalGap 등)을 재사용 가능한 순수 함수로 이식했다.
// App.jsx는 그대로 두고 건드리지 않는다 — 이 함수는 챗봇 tool 등 서버 쪽에서
// 같은 계산을 하기 위한 별도 유틸리티다.

const isMajorCourse = (course) => course.category === '전공필수' || course.category === '전공';
const isGeneralCourse = (course) => course.category === '교양' || course.category === '일반선택';

function sumCredits(courses) {
  return courses.reduce((sum, course) => sum + (Number(course.credits) || 0), 0);
}

function buildBucket(current, required) {
  return {
    current,
    required,
    gap: Math.max(0, required - current),
  };
}

/**
 * 목표 학점(targets) 대비 이미 이수한 과목(completedCourses)과 이번 학기
 * 담은 과목(basketCourses)을 합산해 총학점/전공/교양 현재치와 부족분을 계산한다.
 *
 * @param {Object} targets - majorData.js의 전공 데이터에서 가져온 목표치
 * @param {number} targets.totalCredits
 * @param {number} targets.majorCredits
 * @param {number} targets.generalCredits
 * @param {Array<{credits: number, category: string}>} [completedCourses] - 이미 이수한 과목
 * @param {Array<{credits: number, category: string}>} [basketCourses] - 이번 학기 담은(예정) 과목
 * @returns {{
 *   total: {current: number, required: number, gap: number},
 *   major: {current: number, required: number, gap: number},
 *   general: {current: number, required: number, gap: number},
 * }}
 */
function calculateCreditSummary(targets, completedCourses = [], basketCourses = []) {
  const allCourses = [...completedCourses, ...basketCourses];

  const totalCurrent = sumCredits(allCourses);
  const majorCurrent = sumCredits(allCourses.filter(isMajorCourse));
  const generalCurrent = sumCredits(allCourses.filter(isGeneralCourse));

  return {
    total: buildBucket(totalCurrent, targets.totalCredits),
    major: buildBucket(majorCurrent, targets.majorCredits),
    general: buildBucket(generalCurrent, targets.generalCredits),
  };
}

module.exports = { calculateCreditSummary };
