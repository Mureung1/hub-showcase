// 과목의 완료 여부와 활성/완료 목록 분리.
// 완료 체크·히스토리 기능(이슈 #1524)의 기반이 되는 순수 함수다.
// completedAt: 완료 처리 시각. 값이 있으면 완료, 없으면(null/미설정) 활성.

export function isCompleted(subject) {
  return Boolean(subject && subject.completedAt);
}

export function splitByStatus(subjects) {
  const active = [];
  const completed = [];

  for (const subject of subjects) {
    if (isCompleted(subject)) {
      completed.push(subject);
    } else {
      active.push(subject);
    }
  }

  return { active, completed };
}
