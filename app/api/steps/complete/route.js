import { updatePage } from "@/app/lib/notion";

// 스텝 하나를 끝냈다고 Notion에 영구 기록한다.
export async function POST(request) {
  const { id } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  await updatePage(id, { Done: { checkbox: true } });

  return Response.json({ ok: true });
}
