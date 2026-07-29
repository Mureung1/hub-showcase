import { describe, expect, it } from "vitest";
import { filterQuestLogsAtOrAfter, questLogSyncMessages } from "./useQuestLogSync";

describe("quest log sync messages", () => {
  it("keeps explicit messages for load and save states", () => {
    expect(questLogSyncMessages.loading).toContain("서버 기록");
    expect(questLogSyncMessages.saving).toContain("퀘스트 이벤트");
    expect(questLogSyncMessages.loadError).toContain("로컬 화면 흐름");
    expect(questLogSyncMessages.saveError).toContain("기록 노트");
  });

  it("filters server logs older than the local restart boundary", () => {
    const logs = [
      { id: "old", title: "old", result: "success", exp: 1, createdAt: "2026-07-28T12:00:00.000Z" },
      { id: "new", title: "new", result: "recovery", exp: 2, createdAt: "2026-07-29T12:00:00.000Z" },
    ] as const;

    expect(filterQuestLogsAtOrAfter([...logs], "2026-07-29T00:00:00.000Z").map((log) => log.id)).toEqual(["new"]);
  });
});
