import { updatePage } from "@/app/lib/notion";

// shrink_step tool 실행: 완료 기준을 줄인 새 제목으로 스텝을 갱신한다(Done은 그대로 false).
export async function POST(request) {
  const { id, title } = await request.json();

  if (!id || !title) {
    return Response.json({ error: "id 또는 title이 없어요" }, { status: 400 });
  }

  await updatePage(id, { Title: { title: [{ text: { content: title } }] } });

  return Response.json({ ok: true });
}
