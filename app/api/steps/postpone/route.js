import { updatePage } from "@/app/lib/notion";

function tomorrowDateString() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// postpone_task tool 실행: 스텝의 ScheduledDate를 내일로 갱신해 오늘 목록에서 뺀다.
export async function POST(request) {
  const { id } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  await updatePage(id, { ScheduledDate: { date: { start: tomorrowDateString() } } });

  return Response.json({ ok: true });
}
