import { NextResponse } from "next/server";
import { createPage, queryDatabase, archivePage, NotionConfigError } from "@/app/lib/notion";

// Notion 연동이 살아있는지 확인하는 온보딩용 헬스체크.
// 토큰/DB ID 미설정 시 500이 아니라 친절한 안내 메시지를 반환한다.
export async function GET() {
  const databaseId = process.env.NOTION_STEPS_DB_ID;
  let testPageId;

  try {
    const testTitle = `콕 연동 테스트 ${new Date().toISOString()}`;
    const created = await createPage(databaseId, {
      Title: { title: [{ text: { content: testTitle } }] },
    });
    testPageId = created.id;

    const rows = await queryDatabase(databaseId);
    const found = rows.some(
      (row) => row.properties?.Title?.title?.[0]?.plain_text === testTitle
    );

    if (!found) {
      return NextResponse.json(
        { ok: false, message: "Notion에 썼지만 다시 읽어오지 못했어요. DB 속성 이름(Title)을 확인해주세요." },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, message: "Notion 연동이 정상 동작해요." });
  } catch (err) {
    if (err instanceof NotionConfigError) {
      return NextResponse.json({ ok: false, message: err.message }, { status: 200 });
    }
    return NextResponse.json(
      { ok: false, message: `Notion 연동 확인 중 문제가 발생했어요: ${err.message}` },
      { status: 200 }
    );
  } finally {
    if (testPageId) {
      await archivePage(testPageId).catch(() => {});
    }
  }
}
