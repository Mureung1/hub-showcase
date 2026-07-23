function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function parseDeadline(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const isoMatch = text.match(/(20\d{2})[-./](\d{1,2})[-./](\d{1,2})/);
  const koreanMatch = text.match(/(20\d{2})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?/);
  const match = isoMatch || koreanMatch;

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const numericYear = Number(year);
  const numericMonth = Number(month);
  const numericDay = Number(day);
  const date = new Date(Date.UTC(numericYear, numericMonth - 1, numericDay));

  const isExactCalendarDate = date.getUTCFullYear() === numericYear
    && date.getUTCMonth() === numericMonth - 1
    && date.getUTCDate() === numericDay;

  return isExactCalendarDate ? date : null;
}

function formatDate(date) {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
  ].join("-");
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function createTask(id, title, dueDate = null) {
  return { id, title, dueDate, status: "todo" };
}

export function createTasks(opportunity, match) {
  const tasks = [];
  const deadlineDate = parseDeadline(opportunity.deadline);

  if (deadlineDate) {
    tasks.push(createTask("task-eligibility-check", "지원 가능 여부 최종 확인", formatDate(addDays(deadlineDate, -10))));
    tasks.push(createTask("task-documents-draft", "제출 서류 초안 준비", formatDate(addDays(deadlineDate, -7))));
    tasks.push(createTask("task-application-review", "신청서와 증빙 서류 검토", formatDate(addDays(deadlineDate, -3))));
    tasks.push(createTask("task-final-submit", "최종 제출", formatDate(addDays(deadlineDate, -1))));
  } else {
    tasks.push(createTask("task-deadline-check", "마감일 확인", null));
  }

  opportunity.requiredDocuments.forEach((documentName, index) => {
    tasks.push(createTask(
      `task-document-${index + 1}`,
      `${documentName} 준비`,
      deadlineDate ? formatDate(addDays(deadlineDate, -7)) : null,
    ));
  });

  match.missingInfo.forEach((missingInfo, index) => {
    tasks.push(createTask(
      `task-missing-info-${index + 1}`,
      `${missingInfo} 확인`,
      deadlineDate ? formatDate(addDays(deadlineDate, -10)) : null,
    ));
  });

  return tasks;
}
