import { updatePage, getPage } from "@/app/lib/notion";

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// postpone_task tool 실행: 스텝의 ScheduledDate를 내일로 갱신해 오늘 목록에서 뺀다.
// PostponeCount도 기존 값 읽어서 +1(C10 행동 패턴).
export async function POST(request) {
  const { id } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  const page = await getPage(id);
  const currentCount = page.properties?.PostponeCount?.number ?? 0;

  await updatePage(id, {
    ScheduledDate: { date: { start: tomorrowDateString() } },
    PostponeCount: { number: currentCount + 1 },
  });

  return Response.json({ ok: true });
}
