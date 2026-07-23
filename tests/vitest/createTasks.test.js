import { describe, expect, it } from "vitest";

import { createTasks } from "../../src/services/createTasks.js";

function createOpportunity(overrides = {}) {
  return {
    deadline: "2026-08-31",
    requiredDocuments: [],
    ...overrides,
  };
}

function createMatch(overrides = {}) {
  return {
    missingInfo: [],
    ...overrides,
  };
}

describe("createTasks", () => {
  it("마감일이 있으면 D-10, D-7, D-3, D-1 기본 태스크를 생성한다", () => {
    const tasks = createTasks(createOpportunity(), createMatch());

    expect(tasks).toEqual([
      {
        id: "task-eligibility-check",
        title: "지원 가능 여부 최종 확인",
        dueDate: "2026-08-21",
        status: "todo",
      },
      {
        id: "task-documents-draft",
        title: "제출 서류 초안 준비",
        dueDate: "2026-08-24",
        status: "todo",
      },
      {
        id: "task-application-review",
        title: "신청서와 증빙 서류 검토",
        dueDate: "2026-08-28",
        status: "todo",
      },
      {
        id: "task-final-submit",
        title: "최종 제출",
        dueDate: "2026-08-30",
        status: "todo",
      },
    ]);
  });

  it("한국어 날짜 형식도 마감일로 파싱해 태스크 날짜를 계산한다", () => {
    const tasks = createTasks(
      createOpportunity({ deadline: "2026년 8월 31일" }),
      createMatch(),
    );

    expect(tasks.map((task) => task.dueDate)).toEqual([
      "2026-08-21",
      "2026-08-24",
      "2026-08-28",
      "2026-08-30",
    ]);
  });

  it("월과 연도가 바뀌는 경우에도 D-day 날짜를 정확히 계산한다", () => {
    const tasks = createTasks(
      createOpportunity({ deadline: "2027-01-05" }),
      createMatch(),
    );

    expect(tasks.map((task) => task.dueDate)).toEqual([
      "2026-12-26",
      "2026-12-29",
      "2027-01-02",
      "2027-01-04",
    ]);
  });

  it("존재하지 않는 날짜는 마감일로 사용하지 않는다", () => {
    const tasks = createTasks(
      createOpportunity({ deadline: "2026-02-30" }),
      createMatch(),
    );

    expect(tasks).toEqual([
      {
        id: "task-deadline-check",
        title: "마감일 확인",
        dueDate: null,
        status: "todo",
      },
    ]);
  });

  it("마감일이 없으면 마감일 확인 태스크를 생성한다", () => {
    const tasks = createTasks(
      createOpportunity({ deadline: null }),
      createMatch(),
    );

    expect(tasks).toEqual([
      {
        id: "task-deadline-check",
        title: "마감일 확인",
        dueDate: null,
        status: "todo",
      },
    ]);
  });

  it("제출 서류와 부족 정보를 각각 추가 태스크로 만든다", () => {
    const tasks = createTasks(
      createOpportunity({
        requiredDocuments: ["참가신청서", "재학증명서"],
      }),
      createMatch({
        missingInfo: ["학점 정보", "소득분위"],
      }),
    );

    expect(tasks).toContainEqual({
      id: "task-document-1",
      title: "참가신청서 준비",
      dueDate: "2026-08-24",
      status: "todo",
    });
    expect(tasks).toContainEqual({
      id: "task-document-2",
      title: "재학증명서 준비",
      dueDate: "2026-08-24",
      status: "todo",
    });
    expect(tasks).toContainEqual({
      id: "task-missing-info-1",
      title: "학점 정보 확인",
      dueDate: "2026-08-21",
      status: "todo",
    });
    expect(tasks).toContainEqual({
      id: "task-missing-info-2",
      title: "소득분위 확인",
      dueDate: "2026-08-21",
      status: "todo",
    });
  });

  it("연도가 없는 날짜는 파싱하지 않고 마감일 확인 태스크로 처리한다", () => {
    const tasks = createTasks(
      createOpportunity({ deadline: "8월 31일" }),
      createMatch(),
    );

    expect(tasks).toEqual([
      {
        id: "task-deadline-check",
        title: "마감일 확인",
        dueDate: null,
        status: "todo",
      },
    ]);
  });

  it("requiredDocuments가 없으면 현재 구현은 TypeError를 던진다", () => {
    expect(() => {
      createTasks({ deadline: "2026-08-31" }, createMatch());
    }).toThrow(TypeError);
  });

  it("missingInfo가 없으면 현재 구현은 TypeError를 던진다", () => {
    expect(() => {
      createTasks(createOpportunity(), {});
    }).toThrow(TypeError);
  });
});

