// 스케줄 에이전트(b) — 시드.
// 매칭된 학습법 TOP → 오늘의 시간블록으로 구성한다(규칙 기반).
// 상세 시간표·생활 스케줄(에브리타임식)은 다음 단계이며, 여기서는 최소 블록만 만든다.

export function buildDailySchedule(recommendations = [], routine = {}) {
  const focusMinutes = routine.estimatedMinutes >= 28 ? 25 : 20;
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
