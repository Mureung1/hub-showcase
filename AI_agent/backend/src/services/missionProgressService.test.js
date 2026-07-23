import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateMissionStatus,
  normalizeProgressInput,
} from "./missionProgressService.js";

describe("mission progress helpers", () => {
  it("normalizes progress input by trimming and removing duplicate checklist items", () => {
    const progress = normalizeProgressInput({
      missionId: " it-service-mvp ",
      missionTitle: " MVP 구현 ",
      missionSummary: " 작은 문제 해결 ",
      checkedItems: ["문제 정의", " 문제 정의 ", "", null, "입력 폼"],
      checklistItems: ["문제 정의", "입력 폼", "README 작성"],
    });

    assert.deepEqual(progress, {
      missionId: "it-service-mvp",
      missionTitle: "MVP 구현",
      missionSummary: "작은 문제 해결",
      checkedItems: ["문제 정의", "입력 폼"],
      checklistItems: ["문제 정의", "입력 폼", "README 작성"],
    });
  });

  it("calculates pending, in_progress, completed, and submitted statuses", () => {
    assert.equal(
      calculateMissionStatus({
        existingStatus: "",
        checkedItems: [],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
      "pending"
    );

    assert.equal(
      calculateMissionStatus({
        existingStatus: "pending",
        checkedItems: ["문제 정의"],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
      "in_progress"
    );

    assert.equal(
      calculateMissionStatus({
        existingStatus: "in_progress",
        checkedItems: ["문제 정의", "입력 폼"],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
      "completed"
    );

    assert.equal(
      calculateMissionStatus({
        existingStatus: "submitted",
        checkedItems: [],
        checklistItems: ["문제 정의", "입력 폼"],
      }),
      "submitted"
    );
  });
});
