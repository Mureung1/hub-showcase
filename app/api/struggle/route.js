import { generateObject } from "ai";
import { z } from "zod";
import { solar } from "@/app/lib/solar";
import { getRecentLogs } from "@/app/lib/agentlog";
import { queryDatabase } from "@/app/lib/notion";

// 최근 완료된 스텝들에서 "예상 대비 실제 시간", "미룬 횟수" 요약을 뽑는다(C10 행동 패턴).
async function getBehaviorSummary() {
  const rows = await queryDatabase(process.env.NOTION_STEPS_DB_ID, {
    filter: { property: "Done", checkbox: { equals: true } },
    sorts: [{ property: "CompletedAt", direction: "descending" }],
  });
  const recent = rows.slice(0, 10);
  if (recent.length === 0) return null;

  const ratios = recent
    .map((row) => {
      const estimated = row.properties?.EstimatedMinutes?.number;
      const actual = row.properties?.ActualMinutes?.number;
      return estimated && actual ? actual / estimated : null;
    })
    .filter((r) => r !== null);
  const avgRatio =
    ratios.length > 0 ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null;

  const postponedCount = recent.filter(
    (row) => (row.properties?.PostponeCount?.number ?? 0) > 0
  ).length;

  return {
    avgActualVsEstimatedRatio: avgRatio ? Math.round(avgRatio * 100) / 100 : null,
    postponedStepsOutOfRecent: `${postponedCount}/${recent.length}`,
  };
}

const TOOLS = [
  "split_node",
  "reorder_graph",
  "suggest_break",
  "shrink_step",
  "swap_task",
  "postpone_task",
  "encourage",
  "end_session",
];

const TOOL_MEANINGS =
  "split_node=지금 스텝을 더 작게 쪼갬, reorder_graph=남은 스텝 순서 재배치, " +
  "suggest_break=몇 분 쉴지 직접 정해서 휴식 제안, shrink_step=쪼개지 않고 완료 기준 자체를 최소로 줄임, " +
  "swap_task=지금 스텝을 잠깐 미루고 오늘 목록 중 더 쉬운 다른 태스크로 전환, postpone_task=이 스텝을 내일로 미룸, " +
  "encourage=구조는 안 바꾸고 격려 메시지만 제공, end_session=오늘은 여기까지 하고 중단";

// cold start(recentLogs 없음)일 때 reasonChip 기준 참고용 기울기. 강제 아님(agent-design.md 결정 사항).
const COLD_START_PRIOR =
  "overwhelmed면 shrink_step/split_node 쪽, bored면 swap_task 쪽, tired면 suggest_break 쪽, " +
  "neutral이면 encourage 쪽으로 기울되, 강제는 아니니 남은 시간·스텝 상황을 보고 다르게 판단해도 된다.";

export async function POST(request) {
  const {
    reasonChip,
    currentStep,
    remainingSteps = [],
    rejectedTools = [],
    remainingTimeMinutes,
  } = await request.json();

  // recentLogs는 클라이언트 입력이 아니라 서버가 직접 채운다(T10, S2 갱신).
  const recentLogs = await getRecentLogs({ limit: 15, category: currentStep?.category });
  const behaviorSummary = await getBehaviorSummary();

  // 이미 거절당한 tool은 후보에서 뺀다(S2 제약).
  let candidates = TOOLS.filter((tool) => !rejectedTools.includes(tool));

  // 재판단 시간 게이트(C07, agent-design.md "(4) 거절→재판단 루프"):
  // 이미 한 번 이상 거절당한 상태(재판단 중)인데, 남은 시간으로 남은 할 일을 오늘 안에
  // 다 못 끝낼 상황이면 더 이상 자유롭게 재제안하지 않고 postpone_task/end_session으로 수렴시킨다.
  const isRejudgment = rejectedTools.length > 0;
  const remainingWorkload = remainingSteps.reduce(
    (sum, step) => sum + (step.estimatedMinutes || 0),
    0
  );
  const hasTimeForRejudgment = remainingTimeMinutes > remainingWorkload;

  const isConverging = isRejudgment && !hasTimeForRejudgment;
  if (isConverging) {
    const convergeTools = ["postpone_task", "end_session"].filter(
      (tool) => !rejectedTools.includes(tool)
    );
    if (convergeTools.length === 0) {
      // postpone_task/end_session 둘 다 이미 거절됨: 더 제안할 게 없다. proposedTool을
      // rejectedTools에 든 값(end_session)으로 다시 채우면 S2 "재선택 금지"를 위반하므로,
      // TOOLS에 없는 null로 반환해 "새 제안이 아니라 강제 종결"임을 값 자체로도 보장한다.
      // 화면(page.js)은 final:true를 받으면 proposedTool 값과 무관하게 end_session으로 처리한다.
      return Response.json({
        proposedTool: null,
        reason: "오늘은 여기까지 하고 마무리할게요.",
        final: true,
      });
    }
    candidates = convergeTools;
  }

  const toolChoices = candidates.length > 0 ? candidates : TOOLS;

  // proposedTool은 z.enum이 아니라 z.string()으로 받는다. Solar가 enum 제약을 안 지키고
  // 거절된 tool을 다시 골라버리는 경우가 있어서(실제로 재현됨), 스키마 검증에서 바로
  // 예외를 던지게 두지 않고 아래에서 직접 검사해 안전하게 대체하기 위해서다.
  const struggleSchema = z.object({
    proposedTool: z.string(),
    reason: z.string().describe("이 tool을 고른 이유를 사용자에게 보여줄 한 줄 문장"),
    // shrink_step일 때만 사용: 완료 기준을 실제로 줄인 새 스텝 제목.
    revisedTitle: z.string().optional(),
  });

  const isColdStart = recentLogs.length === 0;

  const system =
    "ADHD 사용자가 할 일을 하다가 힘들다고 알려온 상황에서, 다음에 뭘 해야 할지 tool 하나를 판단하는 어시스턴트다. " +
    `아래 tool 중 하나를 반드시 골라야 한다: ${toolChoices.join(", ")}. ` +
    (rejectedTools.length > 0
      ? `다음 tool은 이번에 이미 거절당했으니 절대 다시 고르면 안 된다: ${rejectedTools.join(", ")}. `
      : "") +
    (isConverging
      ? "오늘 남은 시간으로는 남은 할 일을 다 끝내기 어렵다. 더 이상 다른 방식을 자유롭게 제안하지 말고, 이 스텝을 내일로 미루거나(postpone_task) 오늘은 여기서 중단하는 것(end_session) 중에서만 골라라. "
      : "") +
    `각 tool의 의미: ${TOOL_MEANINGS}. ` +
    (isColdStart
      ? `이 사용자의 과거 기록이 아직 없다(cold start). 이럴 땐 reasonChip을 1차 근거로 참고해라 - ${COLD_START_PRIOR}`
      : "아래 최근 개입 기록을 참고해서, 반복적으로 거절한 tool이나 패턴이 보이면 이번엔 다른 방식을 시도해라.") +
    (behaviorSummary
      ? " 최근 완료한 스텝들의 행동 패턴도 참고해라: avgActualVsEstimatedRatio는 예상 시간 대비 실제 걸린 시간의 배율이다(1보다 크면 평소 예상보다 오래 걸린다는 뜻). postponedStepsOutOfRecent는 최근 스텝 중 한 번이라도 미룬 적 있는 비율이다."
      : "") +
    " shrink_step을 고른다면, 완료 기준 자체를 실제로 최소화한 새 스텝 제목을 revisedTitle에 " +
    '담아라(예: "책상 정리하기" → "책상 위 물건 1개만 치우기"). 다른 tool에는 revisedTitle을 넣지 마라. ' +
    ' reason은 사용자에게 그대로 보여줄 문장이니, reasonChip·estimatedMinutes·remainingSteps 같은 ' +
    "변수 이름이나 개발 용어를 절대 쓰지 말고 짧고 자연스러운 한국어 말투로 써라. " +
    '결과는 반드시 다음 JSON 형식으로만 응답한다(다른 필드 추가 금지): {"proposedTool": string, "reason": string, "revisedTitle": string(선택)}';

  const prompt = JSON.stringify({
    reasonChip,
    currentStep,
    remainingSteps,
    recentLogs,
    behaviorSummary,
    remainingTimeMinutes,
  });

  const { object } = await generateObject({
    model: solar,
    schema: struggleSchema,
    system,
    prompt,
  });

  // Solar가 후보 목록에 없는(주로 이미 거절된) tool을 골라버리는 경우를 대비한 안전망.
  // 계약(S2)상 rejectedTools는 절대 다시 고르면 안 되므로, 후보 밖 값이면 첫 후보로 대체한다.
  // 사용자에게 보이는 reason엔 내부 교정 사실을 노출하지 않고 그럴듯한 문장으로 대체한다.
  if (!toolChoices.includes(object.proposedTool)) {
    console.warn(
      `[struggle] Solar가 후보 밖 tool(${object.proposedTool})을 반환해 ${toolChoices[0]}로 대체함`
    );
    return Response.json({
      proposedTool: toolChoices[0],
      reason: "이전 제안이 잘 안 맞았던 것 같아서, 이번엔 다른 방식을 제안해요.",
    });
  }

  // shrink_step인데 revisedTitle이 빠지면 "완료 기준 축소"를 실행할 수 없다(C08). encourage로
  // 무조건 대체하면 encourage가 이미 거절된 경우 S2 "재선택 금지"를 어기게 되므로, toolChoices
  // (rejectedTools가 이미 빠진 후보)에서 shrink_step이 아닌 첫 후보로 대체한다.
  if (object.proposedTool === "shrink_step" && !object.revisedTitle) {
    const fallback = toolChoices.find((t) => t !== "shrink_step");
    if (!fallback) {
      // shrink_step 말고는 후보가 아예 없다: 더 제안할 게 없으니 T07과 같은 방식으로 강제 종결.
      return Response.json({
        proposedTool: null,
        reason: "지금은 더 제안할 수 있는 게 없어요, 오늘은 여기까지 할게요.",
        final: true,
      });
    }
    console.warn(`[struggle] shrink_step인데 revisedTitle이 없어 ${fallback}로 대체함`);
    return Response.json({
      proposedTool: fallback,
      reason: "이전 제안이 잘 안 맞았던 것 같아서, 이번엔 다른 방식을 제안해요.",
    });
  }

  return Response.json(object);
}
