// server/src/utils/resolveBasketCategory.js
// basket_items 테이블(Supabase)은 course_name/credits/is_major만 저장하고 category를
// 저장하지 않는다. 챗봇이 "이미 담은 과목 중 창업교과목/종합설계교과목이 몇 학점인지"를
// 알려면 category가 필요한데, 오늘은 DB 스키마를 바꾸지 않고 course_name으로
// loadCurriculum() 결과(= categoryOverrides.js가 이미 반영된 과목 목록)를 역매칭해서
// 우회한다.
//
// 한계: 동명 과목이 있으면(같은 이름, 다른 baseCode/분반) 첫 번째로 매칭되는 과목의
// category를 쓰게 되어 오매칭될 수 있다. basket_items가 course_id(baseCode)를
// 저장하도록 스키마를 바꾸는 게 근본 해결책이며, 지금은 임시방편이다.
const { loadCurriculum } = require('../data/loadCurriculum');

/**
 * @param {string} courseName - basket_items.course_name
 * @param {Array} [courses] - 테스트용으로 loadCurriculum() 결과를 주입할 수 있음
 * @returns {string|null} category (예: '창업교과목', '종합설계교과목', '전공' 등), 못 찾으면 null
 */
function resolveCategoryByName(courseName, courses = loadCurriculum()) {
  const match = courses.find((course) => course.name === courseName);
  return match ? match.category : null;
}

module.exports = { resolveCategoryByName };
