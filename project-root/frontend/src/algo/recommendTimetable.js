// algo/recommendTimetable.js
// CLAUDE.md "추천 알고리즘 설계" 기준 구현.
// subjects: lecture 배열 (id, credit, category, department, required, prerequisite, pair_group, tier, times:[{day,start,end}])
// preferences: PreferenceScreen onSubmit이 넘기는 { freeDays, avoidMorning, targetCredit, completedIds, teamPreferred, freeText }

const MORNING_CUTOFF = "12:00"; // 이 시각 이전에 시작하면 "오전 수업"으로 간주
const CREDIT_TOLERANCE = 3; // 목표 학점과의 허용 오차 범위(±)
const MAX_SEARCH_STEPS = 300000; // 후보가 많을 때(예: 교양 700+건) 백트래킹이 무한정 돌지 않도록 하는 안전장치

function timesOverlap(a, b) {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}

function hasTimeConflict(timesA, timesB) {
  return timesA.some((a) => timesB.some((b) => timesOverlap(a, b)));
}

function isMorningLecture(subject) {
  return subject.times.some((t) => t.start < MORNING_CUTOFF);
}

function hasPrerequisiteMet(subject, completedIds) {
  if (!subject.prerequisite || subject.prerequisite.length === 0) return true;
  return subject.prerequisite.every((id) => completedIds.includes(id));
}

// 전공필수는 조건과 무관하게 항상 포함되므로, 조건 필터는 전공필수가 아닌 과목에만 적용한다.
function isConditionValid(subject, { freeDays, avoidMorning, completedIds }) {
  if (!hasPrerequisiteMet(subject, completedIds)) return false;
  if (freeDays.length > 0 && subject.times.some((t) => freeDays.includes(t.day))) return false;
  if (avoidMorning && isMorningLecture(subject)) return false;
  return true;
}

// 동시수강(pair_group) 세트는 하나의 탐색 단위로 묶는다. pair_group이 없는 과목은 단독 단위.
function buildUnits(nonRequiredSubjects) {
  const groups = new Map();
  for (const subject of nonRequiredSubjects) {
    const key = subject.pair_group ?? `__single_${subject.id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(subject);
  }
  return [...groups.values()].map((lectures) => ({
    lectures,
    times: lectures.flatMap((l) => l.times),
    credit: lectures.reduce((sum, l) => sum + l.credit, 0),
  }));
}

function averageTier(lectures) {
  if (lectures.length === 0) return 0;
  const total = lectures.reduce((sum, l) => sum + (l.tier ?? 0), 0);
  return total / lectures.length;
}

// 전공필수끼리 시간이 겹치는 경우(커리큘럼 데이터 오류) 먼저 확정된 과목을 우선하고
// 겹치는 과목은 후보에서 제외한다. "전공필수 강제 포함(시간 안 겹치는 선에서)" 규칙 적용.
function resolveRequiredConflicts(requiredLectures) {
  const kept = [];
  const keptTimes = [];
  for (const lec of requiredLectures) {
    if (hasTimeConflict(lec.times, keptTimes)) {
      console.warn(`전공필수 시간 충돌: "${lec.name}"이(가) 다른 전공필수와 겹쳐 후보에서 제외됨`);
      continue;
    }
    kept.push(lec);
    keptTimes.push(...lec.times);
  }
  return kept;
}

export function recommendTimetable(preferences, subjects) {
  const {
    freeDays = [],
    avoidMorning = false,
    targetCredit,
    completedIds = [],
  } = preferences;
  // teamPreferred: lecture 데이터에 팀플 여부 필드가 아직 없어(schema.sql 참고) 반영할 수 없음. 데이터 보강 전까지는 무시.

  const requiredLectures = resolveRequiredConflicts(subjects.filter((s) => s.required));

  // 전공필수와 pair_group(동시수강 세트)을 공유하는 비필수 과목은 "항상 함께" 규칙에 따라
  // 조건 필터와 무관하게 전공필수와 같이 강제 포함해야 한다 (예: 필수 이론 + 선택 실습 세트).
  const requiredPairGroups = new Set(requiredLectures.map((l) => l.pair_group).filter(Boolean));
  const forcedPairPartners = subjects.filter(
    (s) => !s.required && s.pair_group && requiredPairGroups.has(s.pair_group)
  );
  const forcedPairPartnerIds = new Set(forcedPairPartners.map((s) => s.id));

  const allRequired = [...requiredLectures, ...forcedPairPartners];
  const requiredCredit = allRequired.reduce((sum, l) => sum + l.credit, 0);
  const requiredTimes = allRequired.flatMap((l) => l.times);

  const eligibleElectives = subjects.filter(
    (s) =>
      !s.required &&
      !forcedPairPartnerIds.has(s.id) &&
      isConditionValid(s, { freeDays, avoidMorning, completedIds })
  );

  const allUnits = buildUnits(eligibleElectives)
    .filter((unit) => !hasTimeConflict(unit.times, requiredTimes))
    // 학점이 큰 단위부터 시도하면 목표치에 먼저 근접해 가지치기가 더 빨리 먹힌다.
    .sort((a, b) => b.credit - a.credit);

  // 뒤에서부터의 누적 최대 학점(가지치기용: 남은 후보를 다 더해도 목표 근처에 못 미치면 중단)
  const suffixMaxCredit = new Array(allUnits.length + 1).fill(0);
  for (let i = allUnits.length - 1; i >= 0; i--) {
    suffixMaxCredit[i] = suffixMaxCredit[i + 1] + allUnits[i].credit;
  }

  const results = [];
  let steps = 0;

  function backtrack(startIndex, chosenUnits, chosenCredit) {
    steps += 1;
    if (steps > MAX_SEARCH_STEPS) return;

    const totalCredit = requiredCredit + chosenCredit;
    const diff = Math.abs(totalCredit - targetCredit);
    if (diff <= CREDIT_TOLERANCE) {
      results.push({ units: [...chosenUnits], totalCredit, diff });
    }

    if (startIndex >= allUnits.length) return;
    if (totalCredit + suffixMaxCredit[startIndex] < targetCredit - CREDIT_TOLERANCE) return;

    // chosenUnits는 이 루프가 도는 동안 push/pop으로만 바뀌므로(재귀 진입 전/후 원복) 루프 밖에서 한 번만 계산한다.
    const chosenTimes = chosenUnits.flatMap((u) => u.times);
    for (let i = startIndex; i < allUnits.length && steps <= MAX_SEARCH_STEPS; i++) {
      const unit = allUnits[i];
      if (totalCredit + unit.credit > targetCredit + CREDIT_TOLERANCE) continue;

      if (hasTimeConflict(unit.times, chosenTimes)) continue;

      chosenUnits.push(unit);
      backtrack(i + 1, chosenUnits, chosenCredit + unit.credit);
      chosenUnits.pop();
    }
  }

  backtrack(0, [], 0);

  return results
    .map((r) => {
      const electiveLectures = r.units.flatMap((u) => u.lectures);
      const lectures = [...allRequired, ...electiveLectures];
      return {
        lectures,
        totalCredit: r.totalCredit,
        creditDiff: r.diff,
        tierScore: averageTier(lectures),
      };
    })
    .sort((a, b) => a.creditDiff - b.creditDiff || b.tierScore - a.tierScore)
    .slice(0, 3)
    .map((r, index) => ({
      id: `r${index + 1}`,
      label: `추천 시간표 ${index + 1}`,
      lectures: r.lectures,
      totalCredit: r.totalCredit,
    }));
}
