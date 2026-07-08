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
 * 개인 응답은 인용하지 않는다 (비공개 약속 유지).
 * @param {object} assignment - assignRoles() 결과
 * @param {object} teamStats - 팀 단위 통계 (개인 식별 불가 형태)
 * @returns {Promise<{ summary: string, perMember: object, compromise: string|null }>}
 */
export async function explainAssignment(assignment, teamStats) {
  await delay(1200);
  /* TODO(4단계): 팀 단위 서술 설명 + 전원 기피 역할 타협안 생성 */
  void assignment;
  void teamStats;
  throw new Error('explainAssignment는 4단계에서 구현됩니다');
}
