const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isStringOrNull(value) {
  return typeof value === 'string' || value === null || value === undefined;
}

function validateActualStudyEntry(entry) {
  return (
    entry
    && typeof entry === 'object'
    && typeof entry.id === 'string'
    && typeof entry.area === 'string'
    && typeof entry.title === 'string'
    && Number.isInteger(entry.minutes)
    && entry.minutes >= 1
  );
}

function validateDailyStudyRecordInput(requestBody) {
  const body = requestBody && typeof requestBody === 'object' ? requestBody : {};
  const errors = {};

  if (!UUID_PATTERN.test(body.studyPlanId || '')) {
    errors.studyPlanId = '유효한 학습 계획 id가 필요합니다.';
  }

  if (!DATE_PATTERN.test(body.recordDate || '')) {
    errors.recordDate = '학습 날짜는 YYYY-MM-DD 형식이어야 합니다.';
  }

  if (!Array.isArray(body.generatedTasks)) {
    errors.generatedTasks = '생성된 오늘의 학습 항목은 배열이어야 합니다.';
  }

  if (!Array.isArray(body.completedTaskIds)) {
    errors.completedTaskIds = '완료한 항목 id는 배열이어야 합니다.';
  }

  if (!Array.isArray(body.actualStudyEntries)) {
    errors.actualStudyEntries = '실제 학습 기록은 배열이어야 합니다.';
  } else if (!body.actualStudyEntries.every(validateActualStudyEntry)) {
    errors.actualStudyEntries = '실제 학습 기록은 id, 영역, 내용, 1분 이상의 정수 시간이 필요합니다.';
  }

  if (!isStringOrNull(body.difficultArea)) {
    errors.difficultArea = '어려웠던 영역은 문자열 또는 null이어야 합니다.';
  }

  if (!isStringOrNull(body.nextPriorityArea)) {
    errors.nextPriorityArea = '내일 공부할 영역은 문자열 또는 null이어야 합니다.';
  }

  if (!isStringOrNull(body.reflectionNote)) {
    errors.reflectionNote = '오늘의 메모는 문자열 또는 null이어야 합니다.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    data: {
      studyPlanId: body.studyPlanId,
      recordDate: body.recordDate,
      generatedTasks: body.generatedTasks,
      completedTaskIds: body.completedTaskIds,
      actualStudyEntries: body.actualStudyEntries,
      difficultArea: body.difficultArea || null,
      nextPriorityArea: body.nextPriorityArea || null,
      reflectionNote: body.reflectionNote || null,
    },
    errors,
  };
}

function toDailyStudyRecordDatabaseRow(dailyStudyRecord, userId) {
  return {
    user_id: userId,
    study_plan_id: dailyStudyRecord.studyPlanId,
    study_date: dailyStudyRecord.recordDate,
    generated_tasks: dailyStudyRecord.generatedTasks,
    completed_task_ids: dailyStudyRecord.completedTaskIds,
    actual_study_entries: dailyStudyRecord.actualStudyEntries,
    difficult_area: dailyStudyRecord.difficultArea,
    next_priority_area: dailyStudyRecord.nextPriorityArea,
    reflection_note: dailyStudyRecord.reflectionNote,
    updated_at: new Date().toISOString(),
  };
}

function toDailyStudyRecordResponse(databaseRow) {
  return {
    id: databaseRow.id,
    studyPlanId: databaseRow.study_plan_id,
    studyDate: databaseRow.study_date,
    examType: databaseRow.study_plans?.exam_type || databaseRow.exam_type || null,
    generatedTasks: databaseRow.generated_tasks,
    completedTaskIds: databaseRow.completed_task_ids,
    actualStudyEntries: databaseRow.actual_study_entries,
    difficultArea: databaseRow.difficult_area,
    nextPriorityArea: databaseRow.next_priority_area,
    reflectionNote: databaseRow.reflection_note,
    createdAt: databaseRow.created_at,
    updatedAt: databaseRow.updated_at,
  };
}

export {
  toDailyStudyRecordDatabaseRow,
  toDailyStudyRecordResponse,
  validateDailyStudyRecordInput,
};
