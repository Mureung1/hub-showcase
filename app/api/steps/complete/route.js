import { updatePage } from "@/app/lib/notion";
import { markOutcomeDone } from "@/app/lib/agentlog";

// 스텝 하나를 끝냈다고 Notion에 영구 기록한다.
// agentLogId가 있으면(encourage/shrink_step으로 이어서 완료한 경우) 그 로그도 done으로 갱신(S4).
export async function POST(request) {
  const { id, agentLogId } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  await updatePage(id, { Done: { checkbox: true } });
  if (agentLogId) {
    await markOutcomeDone(agentLogId);
  }

  return Response.json({ ok: true });
}
