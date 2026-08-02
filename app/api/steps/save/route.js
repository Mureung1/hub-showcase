import { createPage } from "@/app/lib/notion";

// T17: 검토 화면(MicrostepReview)에서 사용자가 삭제까지 반영해 확정한 목록만 이 시점에
// Notion Steps DB에 저장한다(S1-save). Brain Dump 분할 시점(S1)엔 저장하지 않는다.
async function saveMicrostep(databaseId, microstep) {
  return createPage(databaseId, {
    Title: { title: [{ text: { content: microstep.title } }] },
    EstimatedMinutes: { number: microstep.estimatedMinutes },
    Category: { select: { name: microstep.category } },
    ScheduledDate: { date: { start: microstep.scheduledDate } },
  });
}

export async function POST(request) {
  const { microsteps = [] } = await request.json();

  if (microsteps.length === 0) {
    return Response.json({ error: "저장할 마이크로스텝이 없어요" }, { status: 400 });
  }

  const databaseId = process.env.NOTION_STEPS_DB_ID;
  await Promise.all(microsteps.map((step) => saveMicrostep(databaseId, step)));

  return Response.json({ saved: microsteps.length });
}
