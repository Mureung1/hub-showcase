import { describe, expect, it } from "vitest";

import { sortTasksByUpcomingDate } from "../../src/utils/taskSchedule.js";

describe("sortTasksByUpcomingDate", () => {
  it("미완료 예정 태스크를 가까운 날짜 순으로 먼저 정렬한다", () => {
    const tasks = sortTasksByUpcomingDate([
      { id: "later", title: "늦은 일정", dueDate: "2026-08-20", status: "todo" },
      { id: "undated", title: "날짜 확인", dueDate: null, status: "todo" },
      { id: "soon", title: "가까운 일정", dueDate: "2026-08-05", status: "todo" },
      { id: "overdue", title: "지난 일정", dueDate: "2026-07-20", status: "todo" },
      { id: "done", title: "완료 일정", dueDate: "2026-08-01", status: "done" },
    ], new Date("2026-08-01T12:00:00Z"));

    expect(tasks.map((task) => task.id)).toEqual(["soon", "later", "overdue", "undated", "done"]);
  });

  it("형식이 불명확한 날짜는 마감일 미정 태스크처럼 뒤로 보낸다", () => {
    const tasks = sortTasksByUpcomingDate([
      { id: "unknown", title: "확인", dueDate: "8월 5일", status: "todo" },
      { id: "scheduled", title: "제출", dueDate: "2026-08-05", status: "todo" },
    ], new Date("2026-08-01T12:00:00Z"));

    expect(tasks.map((task) => task.id)).toEqual(["scheduled", "unknown"]);
  });
});