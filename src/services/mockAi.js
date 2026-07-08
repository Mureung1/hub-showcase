/* 목(mock) AI 서비스 — 실제 LLM API 서버 호출과 동일한 시그니처(async, JSON 반환)로 설계.
   나중에 이 파일의 함수 본문만 fetch 호출로 교체하면 된다. */

import { PLAN_TEMPLATES, EXAM_WEEKS } from '../data/templates';
import { parseDate, toDateInputValue, addDays, diffDays, formatKorean } from '../utils/dates';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isInExamWeek(date) {
  return EXAM_WEEKS.find(
    (w) => date >= parseDate(w.start) && date <= parseDate(w.end),
  );
}

/* 마일스톤 마감이 시험 주간에 걸리면 그 주간 뒤로(마감을 넘기면 앞으로) 옮긴다 */
function avoidExamWeek(date, deadline) {
  const week = isInExamWeek(date);
  if (!week) return date;
  const after = addDays(parseDate(week.end), 3);
  if (after <= deadline) return after;
  return addDays(parseDate(week.start), -3);
}

/**
 * 플래너 에이전트: 과제 정보 → 마일스톤/태스크 계획 초안.
 * @param {object} project - { type, goal, deadline, members }
 * @param {object} options - { variant: number } "다시 제안받기" 시 변형 버전 번호
 * @returns {Promise<{ variant, examNote, milestones, tasks, nextTaskId }>}
 */
export async function generatePlan(project, { variant = 0 } = {}) {
  await delay(1500);

  const variants = PLAN_TEMPLATES[project.type].variants;
  const template = variants[variant % variants.length];

  const start = new Date();
  const deadline = parseDate(project.deadline);
  const totalDays = Math.max(diffDays(start, deadline), 7);

  const milestones = [];
  const tasks = [];
  let taskSeq = 1;

  template.forEach((ms, i) => {
    const raw = addDays(start, Math.round(ms.pos * totalDays));
    const due = ms.pos === 1 ? deadline : avoidExamWeek(raw, deadline);
    const msId = `ms${i + 1}`;
    milestones.push({ id: msId, title: ms.title, dueDate: toDateInputValue(due) });
    ms.tasks.forEach((t) => {
      tasks.push({
        id: `t${taskSeq++}`,
        milestoneId: msId,
        title: t.title,
        roleId: t.roleId,
        status: 'todo', // 5단계 대시보드 칸반의 데이터 소스
      });
    });
  });

  const overlapping = EXAM_WEEKS.filter(
    (w) => parseDate(w.start) <= deadline && parseDate(w.end) >= start,
  );
  let examNote = overlapping.length
    ? `${overlapping.map((w) => `${w.name} 주간(${formatKorean(w.start)}~${formatKorean(w.end)})`).join(', ')}을 피해서 마일스톤을 배치했어요.`
    : '마감일까지 겹치는 시험 주간이 없어서 일정을 고르게 나눴어요.';
  if (variant > 0) examNote = `새로운 구성으로 다시 짜봤어요. ${examNote}`;

  return { variant, examNote, milestones, tasks, nextTaskId: taskSeq };
}

/**
 * 배정 설명 에이전트: 배정 결과 + 팀 통계 → 팀 단위 자연어 설명.
 * 개인 응답은 인용하지 않는다 (비공개 약속 유지) — 집계값 기반의 팀 단위 서술만 생성.
 * @param {object} assignment - assignRoles() 결과
 * @param {object} teamStats - computeTeamStats()의 팀 단위 통계 (개인 식별 불가 형태)
 * @returns {Promise<{ summary: string, points: string[], compromise: string|null }>}
 */
export async function explainAssignment(assignment, teamStats) {
  await delay(1200);

  const { total, matchedPref, expMatched, forcedCount, leaderVolunteer, fullyAvoidedNames, forcedNames } = teamStats;

  const points = [];
  points.push(`${total}명 중 ${matchedPref}명이 본인이 선호한 1~3순위 안의 역할을 맡았어요.`);
  if (expMatched > 0) {
    points.push(`${expMatched}명은 경험이 있는 역할에 배치되어 시행착오를 줄일 수 있어요.`);
  }
  points.push(
    forcedCount === 0
      ? '기피 역할이 배정된 팀원은 없어요.'
      : `불가피하게 기피 역할 배정이 ${forcedCount}건 있었어요 — 아래 타협안을 함께 봐주세요.`,
  );
  if (leaderVolunteer) {
    points.push('조장은 리더 의향을 밝힌 팀원 중에서 정해졌어요.');
  }

  const summary =
    '팀 전체의 선호를 종합했을 때 만족도가 가장 높은 조합이에요. 누가 무엇을 적었는지는 공개하지 않고, 팀 단위 결과만 알려드려요.';

  let compromise = null;
  const problemRoles = fullyAvoidedNames.length > 0 ? fullyAvoidedNames : forcedNames;
  if (problemRoles.length > 0) {
    const names = problemRoles.map((n) => `'${n}'`).join(', ');
    compromise =
      (fullyAvoidedNames.length > 0
        ? `팀 전원이 ${names} 역할을 기피했어요. 그래도 누군가는 맡아야 하니, 이렇게 풀어보면 어때요?`
        : `${names} 역할은 기피에도 불구하고 배정이 불가피했어요. 이렇게 풀어보면 어때요?`) +
      '\n① 로테이션 — 마일스톤마다 담당자를 번갈아 맡기\n② 부담 나누기 — 이 역할을 맡은 팀원의 다른 태스크를 팀이 나눠 갖기\n최종 결정은 팀 투표로 정해요!';
  }

  return { summary, points, compromise };
}
