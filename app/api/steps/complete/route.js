import { updatePage } from "@/app/lib/notion";
import { markOutcomeDone } from "@/app/lib/agentlog";

// 스텝 하나를 끝냈다고 Notion에 영구 기록한다.
// agentLogIds가 있으면(encourage/shrink_step으로 이어서 완료한 경우, 같은 스텝에서 여러 번
// 있었을 수 있어 배열) 그 로그들 전부 done으로 갱신한다(S4 stepRef — Relation이 없어 화면이
// 들고 있던 id 목록으로 갈음).
// startedAt/completedAt/actualMinutes는 C10 행동 패턴 속성(있으면만 기록).
// pauseCount/pauseReasons는 T20(일시정지 + 재개 사유 기록, S7) - 판단 없이 그대로 기록만 한다.
export async function POST(request) {
  const {
    id,
    agentLogIds = [],
    startedAt,
    completedAt,
    actualMinutes,
    pauseCount,
    pauseReasons = [],
  } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  const properties = { Done: { checkbox: true } };
  if (startedAt) properties.StartedAt = { date: { start: startedAt } };
  if (completedAt) properties.CompletedAt = { date: { start: completedAt } };
  if (actualMinutes != null) properties.ActualMinutes = { number: actualMinutes };
  if (pauseCount != null) properties.PauseCount = { number: pauseCount };
  const joinedReasons = pauseReasons.filter((reason) => reason && reason.trim() !== "").join(" / ");
  if (joinedReasons) {
    properties.PauseReasons = { rich_text: [{ text: { content: joinedReasons } }] };
  }

  await updatePage(id, properties);
  await Promise.all(agentLogIds.map((logId) => markOutcomeDone(logId)));

  return Response.json({ ok: true });
}
