import { createPage, queryDatabase, updatePage } from "@/app/lib/notion";

function toNotionProperties(entry) {
  return {
    timestamp: { date: { start: entry.timestamp.toISOString() } },
    task_category: { select: { name: entry.task_category } },
    reason_chip: { select: { name: entry.reason_chip } },
    proposed_tool: { select: { name: entry.proposed_tool } },
    proposed_reason: { title: [{ text: { content: entry.proposed_reason } }] },
    accepted: { checkbox: entry.accepted },
    // 제안 시점엔 결과를 알 수 없어서 항상 pending으로 시작한다(S4에서 갱신).
    outcome: { select: { name: "pending" } },
  };
}

function fromNotionPage(page) {
  const p = page.properties;
  return {
    id: page.id,
    timestamp: p.timestamp?.date?.start ? new Date(p.timestamp.date.start) : null,
    task_category: p.task_category?.select?.name ?? null,
    reason_chip: p.reason_chip?.select?.name ?? null,
    proposed_tool: p.proposed_tool?.select?.name ?? null,
    proposed_reason: p.proposed_reason?.title?.[0]?.plain_text ?? "",
    accepted: p.accepted?.checkbox ?? false,
    outcome: p.outcome?.select?.name ?? "pending",
  };
}

export async function logStruggle(entry) {
  const databaseId = process.env.NOTION_AGENTLOG_DB_ID;
  return createPage(databaseId, toNotionProperties(entry));
}

// 완료 시 즉시 호출: 해당 로그 하나만 done으로 갱신(S4).
export async function markOutcomeDone(logId) {
  return updatePage(logId, { outcome: { select: { name: "done" } } });
}

// 다음 방문(Brain Dump 시작) 시 호출: 오늘 이전 timestamp의 pending을 전부 not_done으로(S4).
// "이 로그가 어느 스텝이었는지"는 안 보고, 시간이 지나도록 pending이면 안 끝난 걸로 친다.
export async function sweepStaleLogs() {
  const databaseId = process.env.NOTION_AGENTLOG_DB_ID;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const pending = await queryDatabase(databaseId, {
    filter: { property: "outcome", select: { equals: "pending" } },
  });

  const stale = pending.filter((page) => {
    const timestamp = page.properties.timestamp?.date?.start;
    return timestamp && new Date(timestamp) < todayStart;
  });

  await Promise.all(
    stale.map((page) =>
      updatePage(page.id, { outcome: { select: { name: "not_done" } } })
    )
  );

  return stale.length;
}

// category를 주면 같은 category 기록을 최신순으로 먼저 채우고,
// limit이 안 채워지면 나머지는 category 상관없이 최신순으로 채운다(S3 "category 우선").
export async function getRecentLogs({ limit, category } = {}) {
  const databaseId = process.env.NOTION_AGENTLOG_DB_ID;
  const sorts = [{ property: "timestamp", direction: "descending" }];

  if (!category) {
    const rows = await queryDatabase(databaseId, { sorts });
    return rows.slice(0, limit).map(fromNotionPage);
  }

  const matching = await queryDatabase(databaseId, {
    filter: { property: "task_category", select: { equals: category } },
    sorts,
  });
  const matchingLogs = matching.slice(0, limit).map(fromNotionPage);
  if (matchingLogs.length >= limit) return matchingLogs;

  const all = await queryDatabase(databaseId, { sorts });
  const matchingIds = new Set(matchingLogs.map((log) => log.id));
  const fillers = all
    .filter((page) => !matchingIds.has(page.id))
    .slice(0, limit - matchingLogs.length)
    .map(fromNotionPage);

  return [...matchingLogs, ...fillers];
}
