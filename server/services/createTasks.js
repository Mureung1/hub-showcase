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
  const date = new Date(`${year}-${padDatePart(month)}-${padDatePart(day)}T00:00:00+09:00`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function createTask(title, dueDate = null) {
  return {
    title,
    dueDate,
    status: "todo",
  };
}

export function createTasks(opportunity, match) {
  const tasks = [];
  const deadlineDate = parseDeadline(opportunity.deadline);

  if (deadlineDate) {
    tasks.push(createTask("지원 가능 여부 최종 확인", formatDate(addDays(deadlineDate, -10))));
    tasks.push(createTask("제출 서류 초안 준비", formatDate(addDays(deadlineDate, -7))));
    tasks.push(createTask("신청서와 증빙 서류 검토", formatDate(addDays(deadlineDate, -3))));
    tasks.push(createTask("최종 제출", formatDate(addDays(deadlineDate, -1))));
  } else {
    tasks.push(createTask("마감일 확인", null));
  }

  opportunity.requiredDocuments.forEach((documentName) => {
    tasks.push(
      createTask(
        `${documentName} 준비`,
        deadlineDate ? formatDate(addDays(deadlineDate, -7)) : null,
      ),
    );
  });

  match.missingInfo.forEach((missingInfo) => {
    tasks.push(createTask(`${missingInfo} 확인`, deadlineDate ? formatDate(addDays(deadlineDate, -10)) : null));
  });

  return tasks;
}
