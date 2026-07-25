import { generateObject } from "ai";
import { z } from "zod";
import { solar } from "@/app/lib/solar";
import { createPage } from "@/app/lib/notion";

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
});

// scheduledDate는 모델이 판단하지 않고 서버가 채운다(생성 시점 오늘 날짜, skills.md S1).
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
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
  const { text } = await request.json();

  if (!text || text.trim() === "") {
    return Response.json({ error: "text가 비어 있어요" }, { status: 400 });
  }

  const { object } = await generateObject({
    model: solar,
    schema: brainDumpSchema,
    system:
      "ADHD 사용자가 두서없이 적은 할 일을 25분 이내에 끝낼 수 있는 마이크로 스텝들로 쪼개는 어시스턴트다. " +
      "각 스텝은 바로 실행할 수 있을 만큼 구체적이어야 하고, 실행 순서대로 나열한다. " +
      "category는 다음 중 하나로 분류한다: cleaning(청소/정리), contact(연락), paperwork(문서작성), " +
      "errands(외출/이동), self_care(자기관리), work(학습/업무), other(기타). " +
      '결과는 반드시 다음 JSON 형식으로만 응답한다(다른 필드 추가 금지): ' +
      '{"microsteps": [{"title": string, "estimatedMinutes": number, "category": string}]}',
    prompt: text,
  });

  const scheduledDate = todayDateString();
  const microsteps = object.microsteps.map((step) => ({
    ...step,
    estimatedMinutes: Math.round(step.estimatedMinutes),
    scheduledDate,
  }));

  const databaseId = process.env.NOTION_STEPS_DB_ID;
  await Promise.all(microsteps.map((step) => saveMicrostep(databaseId, step)));

  return Response.json({ microsteps });
}
