import { archivePage } from "@/app/lib/notion";

// split_node tool 실행 중 사용: 재분할 전 원래 스텝을 지운다(새 스텝들로 교체되므로).
export async function POST(request) {
  const { id } = await request.json();

  if (!id) {
    return Response.json({ error: "id가 없어요" }, { status: 400 });
  }

  await archivePage(id);

  return Response.json({ ok: true });
}
