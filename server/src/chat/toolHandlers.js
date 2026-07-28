// server/src/chat/toolHandlers.js
// toolDeclarations.js에 선언된 tool 이름과 실제 계산 엔진 함수를 연결한다.
// "계산은 엔진이, 대화는 챗봇이 맡는다" 원칙에 따라 여기서는 숫자를 직접 계산하지
// 않고 server/src/utils, server/src/data의 기존 순수 함수만 호출해서 그 결과를 그대로 반환한다.
const { calculateCreditSummary } = require('../utils/creditSummary');
const { evaluateTrackRequirements } = require('../utils/gradRequirements');
const { calculateSemesterPlan } = require('../utils/semesterPlan');
const { loadCurriculum } = require('../data/loadCurriculum');

/**
 * get_graduation_status: 총학점/전공/교양 부족분 + 트랙 특수요건 충족 현황.
 *
 * track은 모델이 넘긴 args.track보다 ctx.track(client가 body로 실어 보낸, 사용자가
 * 실제로 선택한 트랙)을 우선한다 — 트랙처럼 "실제 상태"인 값을 모델이 임의로 바꿔서
 * 계산하게 두면 계산 엔진이 아니라 모델이 결과를 좌우하게 된다.
 *
 * ctx.basketCourses는 App.jsx의 basketCourses(전체 개설과목 카탈로그)가 아니라
 * App.jsx의 selectedCourses(사용자가 실제로 선택한 과목)를 받는 자리다 — 이름은
 * basketCourses로 유지하되 의미는 "이번 학기 계획분"이다.
 *
 * 이미 이수한 과목은 과목별 리스트로 넘어오지 않는다(ctx.progressSubmitted가
 * 총점/전공/교양 숫자 합계로만 존재). 그래서 계산을 두 단계로 나눈다:
 *   a. calculateCreditSummary에는 completedCourses 자리에 항상 빈 배열을 넘겨
 *      basketCourses(이번 학기 계획분)만으로 current/required/gap을 먼저 구하고
 *   b. 그 current에 progressSubmitted(이미 이수한 학점 합계)를 더해서 최종
 *      current/gap을 재조립한다.
 */
function getGraduationStatus(args, ctx) {
  const { targets, basketCourses = [], progressSubmitted } = ctx;

  const plannedSummary = calculateCreditSummary(targets, [], basketCourses);

  const priorCredits = {
    total: Number(progressSubmitted?.total) || 0,
    major: Number(progressSubmitted?.major) || 0,
    general: Number(progressSubmitted?.general) || 0,
  };

  const combineBucket = (bucket, prior) => {
    const current = bucket.current + prior;
    return { current, required: bucket.required, gap: Math.max(0, bucket.required - current) };
  };

  const creditSummary = {
    total: combineBucket(plannedSummary.total, priorCredits.total),
    major: combineBucket(plannedSummary.major, priorCredits.major),
    general: combineBucket(plannedSummary.general, priorCredits.general),
  };

  const track = ctx.track ?? args?.track ?? null;
  // 알려진 제한사항: 특수요건(창업교과목/종합설계 등)은 basketCourses(이번 학기
  // 계획분)만 갖고 판정한다. progressSubmitted는 과목별 정보가 없는 숫자 합계라
  // 예전에 이미 들은 특수과목이 있어도 여기 반영되지 않는다.
  let trackRequirements = null;
  if (track) {
    trackRequirements = evaluateTrackRequirements(basketCourses, track);
  }

  return { creditSummary, track, trackRequirements };
}

/**
 * simulate_plan: args.additionalCourses(모델/사용자가 제안한 미래 수강 과목)를
 * 현재 누적 학점 위에 더해서 학기당 필요 학점을 계산한다.
 * additionalCourses에는 category가 없어서(tool 스키마상 name/credits만 있음)
 * 총학점에만 더하고, 전공/교양 세부 목표는 basketCourses(이번 학기 계획분) +
 * progressSubmitted(이미 이수한 학점 합계) 기준 그대로 사용한다.
 */
function simulatePlan(args, ctx) {
  const { targets, basketCourses = [], progressSubmitted, currentSemester } = ctx;
  const additionalCourses = args?.additionalCourses ?? [];

  const plannedSummary = calculateCreditSummary(targets, [], basketCourses);
  const priorCredits = {
    total: Number(progressSubmitted?.total) || 0,
    major: Number(progressSubmitted?.major) || 0,
    general: Number(progressSubmitted?.general) || 0,
  };
  const additionalTotal = additionalCourses.reduce(
    (sum, c) => sum + (Number(c.credits) || 0),
    0
  );

  const plan = calculateSemesterPlan({
    currentSemester,
    combinedTotal: plannedSummary.total.current + priorCredits.total + additionalTotal,
    combinedMajor: plannedSummary.major.current + priorCredits.major,
    combinedGeneral: plannedSummary.general.current + priorCredits.general,
    goalTotal: targets.totalCredits,
    goalMajor: targets.majorCredits,
    goalGeneral: targets.generalCredits,
  });

  return { additionalCourses, additionalTotal, plan };
}

/**
 * recommend_courses: 실제 개설과목(loadCurriculum) 중 shortageArea와 category 또는
 * specialTags가 일치하는 과목을 추천한다. 이미 이수했거나 바구니에 담은 과목은 제외한다.
 */
function recommendCourses(args, ctx) {
  const shortageArea = args?.shortageArea;
  if (!shortageArea) {
    throw new Error('shortageArea가 필요합니다.');
  }

  const { basketCourses = [] } = ctx;
  const alreadyTakenNames = new Set(basketCourses.map((c) => c.name));

  const matches = loadCurriculum().filter(
    (course) =>
      !alreadyTakenNames.has(course.name) &&
      (course.category === shortageArea || course.specialTags.includes(shortageArea))
  );

  return {
    shortageArea,
    recommendations: matches.slice(0, 5).map((c) => ({
      id: c.id,
      name: c.name,
      credits: c.credits,
      category: c.category,
      specialTags: c.specialTags,
      grade: c.grade,
    })),
  };
}

const HANDLERS = {
  get_graduation_status: getGraduationStatus,
  simulate_plan: simulatePlan,
  recommend_courses: recommendCourses,
};

/**
 * @param {string} name - tool 이름 (toolDeclarations.js의 name과 일치)
 * @param {Object} args - 모델이 넘긴 함수 호출 인자
 * @param {Object} ctx - POST /api/chat 요청 body에서 온 상태 (targets, progressSubmitted, basketCourses, track, currentSemester)
 */
function executeTool(name, args, ctx) {
  const handler = HANDLERS[name];
  if (!handler) {
    throw new Error(`알 수 없는 tool입니다: ${name}`);
  }
  return handler(args, ctx);
}

module.exports = { executeTool };
