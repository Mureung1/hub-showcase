import { getDaysUntil } from "./daysUntil.js";

// 이보다 짧게 받으면 자리에 앉아서 뭘 하기가 어렵다. 잘게 흩뿌리느니 오늘은 건너뛴다.
export const MIN_BLOCK_MINUTES = 20;
// "37분 12초" 같은 값은 계획으로 쓸 수 없다. 10분 단위로만 나눈다.
export const BLOCK_UNIT_MINUTES = 10;
// 시험이 이 안에 있는 과목이 오늘 계획에서 빠지면 그냥 지우지 않고 알려준다.
const SOON_DAYS = 3;

// 우선순위 점수 비율로 시간을 나눈다. 호출하는 쪽에서 점수 내림차순으로 정렬해 넘긴다.
function allocate(subjects, totalMinutes) {
  const totalScore = subjects.reduce((sum, s) => sum + s.priorityScore, 0);

  const blocks = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    examDate: subject.examDate,
    minutes:
      Math.floor(
        ((subject.priorityScore / totalScore) * totalMinutes) / BLOCK_UNIT_MINUTES
      ) * BLOCK_UNIT_MINUTES,
  }));

  // 10분 단위로 내리고 남은 시간은 점수가 높은 과목부터 10분씩 돌려준다.
  let left = totalMinutes - blocks.reduce((sum, block) => sum + block.minutes, 0);
  for (let i = 0; left >= BLOCK_UNIT_MINUTES; i += 1) {
    blocks[i % blocks.length].minutes += BLOCK_UNIT_MINUTES;
    left -= BLOCK_UNIT_MINUTES;
  }

  return blocks;
}

// 오늘 쓸 수 있는 시간을 과목별로 나눈다.
// 순위는 "어느 과목부터"까지만 답한다. 학생의 다음 질문은 "그래서 각각 얼마나"다.
export function buildStudyPlan(subjects, totalMinutes, today = new Date()) {
  function toSkipped(subject) {
    const daysUntil = getDaysUntil(subject.examDate, today);
    return {
      id: subject.id,
      name: subject.name,
      examDate: subject.examDate,
      daysUntil,
      isSoon: daysUntil !== null && daysUntil <= SOON_DAYS,
    };
  }

  // 점수가 0인 과목은 아는 요인이 하나도 없다는 뜻이라 나눌 근거가 없다.
  const ranked = [...subjects]
    .filter((subject) => subject.priorityScore > 0)
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const noScore = subjects.filter((subject) => !(subject.priorityScore > 0));

  const hasUsableTime =
    Number.isFinite(totalMinutes) && totalMinutes >= MIN_BLOCK_MINUTES;

  if (ranked.length === 0 || !hasUsableTime) {
    return {
      blocks: [],
      skipped: [...ranked, ...noScore].map(toSkipped),
      assignedMinutes: 0,
    };
  }

  // 최소 블록을 못 채우는 과목이 없어질 때까지 점수가 낮은 쪽부터 뺀다.
  let pool = ranked;
  let blocks = allocate(pool, totalMinutes);
  while (pool.length > 1 && blocks.some((block) => block.minutes < MIN_BLOCK_MINUTES)) {
    pool = pool.slice(0, -1);
    blocks = allocate(pool, totalMinutes);
  }

  const plannedIds = new Set(pool.map((subject) => subject.id));

  return {
    blocks,
    skipped: [
      ...ranked.filter((subject) => !plannedIds.has(subject.id)),
      ...noScore,
    ].map(toSkipped),
    assignedMinutes: blocks.reduce((sum, block) => sum + block.minutes, 0),
  };
}

export function formatMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) {
    return `${rest}분`;
  }
  if (rest === 0) {
    return `${hours}시간`;
  }
  return `${hours}시간 ${rest}분`;
}
