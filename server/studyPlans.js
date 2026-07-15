const ALLOWED_EXAM_TYPES = new Set([
  'TOEIC',
  'OPIc',
  'TOEIC Speaking',
  'TOEFL',
]);

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MIN_DAILY_STUDY_MINUTES = 1;
const MAX_DAILY_STUDY_MINUTES = 720;

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function isValidCalendarDate(value) {
  const match = DATE_PATTERN.exec(value);

  if (!match) {
    return false;
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
  );
}

function validateStudyPlanInput(requestBody) {
  const body = requestBody && typeof requestBody === 'object' ? requestBody : {};
  const errors = {};

  const examType = typeof body.examType === 'string' ? body.examType.trim() : '';
  const targetScore = typeof body.targetScore === 'string' ? body.targetScore.trim() : '';
  const examDate = typeof body.examDate === 'string' ? body.examDate.trim() : '';
  const isFirstAttempt = body.isFirstAttempt;
  const dailyStudyMinutes = body.dailyStudyMinutes;
  let currentScore = null;

  if (!ALLOWED_EXAM_TYPES.has(examType)) {
    errors.examType = '지원하는 시험을 선택해 주세요.';
  }

  if (typeof isFirstAttempt !== 'boolean') {
    errors.isFirstAttempt = '처음 응시 여부는 boolean 값이어야 합니다.';
  }

  if (isFirstAttempt === false) {
    currentScore = typeof body.currentScore === 'string' ? body.currentScore.trim() : '';

    if (!currentScore) {
      errors.currentScore = '현재 점수 또는 등급은 필수입니다.';
    }
  }

  if (!targetScore) {
    errors.targetScore = '목표 점수 또는 등급은 필수입니다.';
  }

  if (!isValidCalendarDate(examDate) || examDate <= getLocalDateString()) {
    errors.examDate = '시험일은 YYYY-MM-DD 형식의 오늘 이후 실제 날짜여야 합니다.';
  }

  if (
    !Number.isInteger(dailyStudyMinutes)
    || dailyStudyMinutes < MIN_DAILY_STUDY_MINUTES
    || dailyStudyMinutes > MAX_DAILY_STUDY_MINUTES
  ) {
    errors.dailyStudyMinutes = '학습 가능 시간은 1 이상 720 이하의 정수여야 합니다.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      examType,
      isFirstAttempt,
      currentScore,
      targetScore,
      examDate,
      dailyStudyMinutes,
    },
    errors,
  };
}

function toStudyPlanDatabaseRow(studyPlan) {
  return {
    exam_type: studyPlan.examType,
    is_first_attempt: studyPlan.isFirstAttempt,
    current_score: studyPlan.currentScore,
    target_score: studyPlan.targetScore,
    exam_date: studyPlan.examDate,
    daily_study_minutes: studyPlan.dailyStudyMinutes,
  };
}

function toStudyPlanResponse(databaseRow) {
  return {
    id: databaseRow.id,
    examType: databaseRow.exam_type,
    isFirstAttempt: databaseRow.is_first_attempt,
    currentScore: databaseRow.current_score,
    targetScore: databaseRow.target_score,
    examDate: databaseRow.exam_date,
    dailyStudyMinutes: databaseRow.daily_study_minutes,
    createdAt: databaseRow.created_at,
  };
}

export {
  toStudyPlanDatabaseRow,
  toStudyPlanResponse,
  validateStudyPlanInput,
};
