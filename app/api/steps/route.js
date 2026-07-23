import { queryDatabase } from "@/app/lib/notion";

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

// 오늘(또는 그 이전) 예정이고 아직 안 끝난 스텝만, 만든 순서(=실행 순서)대로 가져온다.
export async function GET() {
  const databaseId = process.env.NOTION_STEPS_DB_ID;

  const rows = await queryDatabase(databaseId, {
    filter: {
      and: [
        { property: "Done", checkbox: { equals: false } },
        { property: "ScheduledDate", date: { on_or_before: todayDateString() } },
      ],
    },
    sorts: [{ timestamp: "created_time", direction: "ascending" }],
  });

  const steps = rows.map((row) => ({
    id: row.id,
    title: row.properties?.Title?.title?.[0]?.plain_text ?? "",
    estimatedMinutes: row.properties?.EstimatedMinutes?.number ?? null,
    category: row.properties?.Category?.select?.name ?? null,
    scheduledDate: row.properties?.ScheduledDate?.date?.start ?? null,
  }));

  return Response.json({ steps });
}
