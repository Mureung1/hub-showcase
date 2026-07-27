import { generateObject } from "ai";
import { z } from "zod";
import { solar } from "@/app/lib/solar";
import { createPage } from "@/app/lib/notion";
import { sweepStaleLogs } from "@/app/lib/agentlog";

// skills.md 고정 셋 (task_category, 7개). 한글 뜻: cleaning=청소/정리, contact=연락,
// paperwork=문서작성, errands=외출/이동, self_care=자기관리, work=학습/업무, other=기타.
const TASK_CATEGORIES = [
  "cleaning",
  "contact",
  "paperwork",
  "errands",
  "self_care",
  "work",
  "other",
];

const brainDumpSchema = z.object({
  microsteps: z
    .array(
      z.object({
        title: z.string().describe("25분 이내에 끝낼 수 있는 구체적인 행동 한 문장"),
        // Solar가 가끔 정수 대신 12.5 같은 소수를 반환해서 .int()로 두면 스키마 검증에서
        // 그대로 죽는다. 소수도 받아서 아래에서 반올림해 정수로 맞춘다.
        estimatedMinutes: z.number().min(1).max(25),
        category: z.enum(TASK_CATEGORIES).describe("이 스텝이 속하는 분류"),
      })
    )
    .min(1)
    .describe("입력을 실행 가능한 순서대로 쪼갠 마이크로 스텝 목록"),
  // T14: 기한 판단. 입력(과 지금까지의 답변)에 기한이 명확히 없으면 true.
  needsDeadlineClarification: z.boolean(),
  followUpQuestion: z
    .string()
    .optional()
    .describe("needsDeadlineClarification이 true일 때, 사용자에게 되물을 한 줄 질문"),
  daysFromToday: z
    .number()
    .int()
    .min(0)
    .max(30)
    .optional()
    .describe("기한이 명확할 때, 오늘로부터 며칠 뒤인지(오늘=0)"),
});

// scheduledDate는 모델이 직접 날짜를 쓰지 않고, 오늘로부터 며칠 뒤인지(daysFromToday)만
// 판단하면 서버가 실제 날짜 문자열로 변환한다(skills.md S1).
function dateStringFromToday(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

async function saveMicrostep(databaseId, microstep) {
  return createPage(databaseId, {
    Title: { title: [{ text: { content: microstep.title } }] },
    EstimatedMinutes: { number: microstep.estimatedMinutes },
    Category: { select: { name: microstep.category } },
    ScheduledDate: { date: { start: microstep.scheduledDate } },
  });
}

export async function POST(request) {
  const { text, turn = 0, clarifications = [] } = await request.json();

  if (!text || text.trim() === "") {
    return Response.json({ error: "text가 비어 있어요" }, { status: 400 });
  }

  // S4: 스케줄러 없이 Brain Dump 시작 시 어제까지의 pending 로그를 일괄 정리한다.
  await sweepStaleLogs();

  // T14: 이미 질문을 2번(turn>=2) 한 뒤라면 더 되묻지 않고 기본값(오늘)으로 강제 확정한다.
  const mustFinalize = turn >= 2;

  const { object } = await generateObject({
    model: solar,
    schema: brainDumpSchema,
    system:
      "ADHD 사용자가 두서없이 적은 할 일을 25분 이내에 끝낼 수 있는 마이크로 스텝들로 쪼개는 어시스턴트다. " +
      "각 스텝은 바로 실행할 수 있을 만큼 구체적이어야 하고, 실행 순서대로 나열한다. " +
      "category는 다음 중 하나로 분류한다: cleaning(청소/정리), contact(연락), paperwork(문서작성), " +
      "errands(외출/이동), self_care(자기관리), work(학습/업무), other(기타). " +
      "입력(과 지금까지의 답변)에 기한이 언제인지 명확히 드러나 있는지도 같이 판단해라. " +
      "명확하면 needsDeadlineClarification을 false로 하고 daysFromToday(오늘=0, 내일=1 식)를 채워라. " +
      (mustFinalize
        ? "기한이 아직도 불명확하더라도 이번엔 절대 되묻지 말고 needsDeadlineClarification을 " +
          "false로, daysFromToday를 0(오늘)으로 확정해라. "
        : "불명확하면 needsDeadlineClarification을 true로 하고, followUpQuestion에 자연스러운 " +
          "한국어로 짧게 되물을 질문 하나를 담아라(예: \"이거 언제까지 하면 될까?\"). ") +
      '결과는 반드시 다음 JSON 형식으로만 응답한다(다른 필드 추가 금지): ' +
      '{"microsteps": [{"title": string, "estimatedMinutes": number, "category": string}], ' +
      '"needsDeadlineClarification": boolean, "followUpQuestion": string(선택), "daysFromToday": number(선택)}',
    prompt: JSON.stringify({ text, clarifications }),
  });

  if (object.needsDeadlineClarification && !mustFinalize) {
    return Response.json({
      microsteps: null,
      followUpQuestion: object.followUpQuestion || "이건 언제까지 하면 될까?",
    });
  }

  const scheduledDate = dateStringFromToday(object.daysFromToday ?? 0);
  const microsteps = object.microsteps.map((step) => ({
    ...step,
    estimatedMinutes: Math.round(step.estimatedMinutes),
    scheduledDate,
  }));

  const databaseId = process.env.NOTION_STEPS_DB_ID;
  await Promise.all(microsteps.map((step) => saveMicrostep(databaseId, step)));

  return Response.json({ microsteps, followUpQuestion: null });
}
