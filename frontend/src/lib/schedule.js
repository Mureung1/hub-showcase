// 스케줄 에이전트(b) — 시드 + v1.5 주간 분산.
// 매칭된 학습법 TOP → 오늘의 시간블록으로 구성한다(규칙 기반).
// 상세 시간표·생활 스케줄(에브리타임식)은 v1.5 완주 후 재검토한다(§C-2, docs/backlog.md).

export function buildDailySchedule(recommendations = [], routine = {}, { availableMinutes } = {}) {
  // 가용시간(task/state 입력) 입력 시 짧은 시간일수록 집중 블록을 좁힌다. 미입력 시 기존 규칙 유지.
  const focusMinutes = availableMinutes
    ? Math.max(15, Math.min(25, Math.floor(availableMinutes / 2)))
    : routine.estimatedMinutes >= 28
      ? 25
      : 20;
  const recoveryMinutes = routine.recoveryMinutes ?? 3;

  const blocks = recommendations.slice(0, 2).map((rec, index) => ({
    order: index + 1,
    kind: "focus",
    minutes: focusMinutes,
    title: rec.title,
    text: rec.action,
  }));

  blocks.push({
    order: blocks.length + 1,
    kind: "recovery",
    minutes: recoveryMinutes,
    title: "회복",
    text: routine.recoveryStep ?? "짧게 자리에서 일어나 몸을 풀고 다음 재료 1개만 남깁니다.",
  });

  const totalMinutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
  return { blocks, totalMinutes };
}

// v1.5: 분산·인출 재현 시점을 사흘에 걸쳐 배치한다(§C-2). [F1] 분산연습 최고효용, [A4] 인출간격 이점.
// 마감이 오늘이면 분산할 시간이 없으므로 압축 안내로 대체한다 — 실제 알림·캘린더 연동은 하지 않는다(하드룰).
export function buildWeeklyPlan(recommendations = [], { deadline } = {}) {
  const topTitle = recommendations[0]?.title ?? "핵심 학습법";

  if (deadline === "today") {
    return {
      compressed: true,
      note: "마감이 오늘이라 이번 내용은 분산 없이 오늘 안에 마무리합니다. 분산 재인출은 다음 과제부터 적용해볼 수 있습니다.",
      checkpoints: [],
    };
  }

  return {
    compressed: false,
    note: "같은 내용을 하루에 몰아보지 않고 사흘에 걸쳐 다시 떠올리면 더 오래 남을 수 있습니다(분산·인출 효과, [F1][A4]).",
    checkpoints: [
      { day: "오늘", label: `${topTitle} 방식으로 처음 익히기` },
      { day: "내일", label: "오늘 배운 내용을 5분 인출로 되짚기" },
      { day: "이틀 뒤", label: "다시 5분 인출로 확인하고, 막힌 부분만 재학습" },
    ],
  };
}
