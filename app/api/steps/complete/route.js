import { updatePage } from "@/app/lib/notion";
import { markOutcomeDone } from "@/app/lib/agentlog";

// 스텝 하나를 끝냈다고 Notion에 영구 기록한다.
// agentLogId가 있으면(encourage/shrink_step으로 이어서 완료한 경우) 그 로그도 done으로 갱신(S4).
// startedAt/completedAt/actualMinutes는 C10 행동 패턴 속성(있으면만 기록).
export async function POST(request) {
  const { id, agentLogId, startedAt, completedAt, actualMinutes } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  const properties = { Done: { checkbox: true } };
  if (startedAt) properties.StartedAt = { date: { start: startedAt } };
  if (completedAt) properties.CompletedAt = { date: { start: completedAt } };
  if (actualMinutes != null) properties.ActualMinutes = { number: actualMinutes };

  await updatePage(id, properties);
  if (agentLogId) {
    await markOutcomeDone(agentLogId);
  }

  return Response.json({ ok: true });
}
