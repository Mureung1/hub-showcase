import { describe, expect, it } from "vitest";
import { getTaskDeadlinePresentation } from "./taskDeadline.js";

const NOW = new Date("2026-07-27T03:00:00.000Z"); // 7월 27일 12:00 KST

describe("getTaskDeadlinePresentation", () => {
  it("현재보다 이전이면 기한 초과로 표시한다", () => {
    expect(
      getTaskDeadlinePresentation("2026-07-27T02:59:59.999Z", NOW),
    ).toEqual({
      kind: "overdue",
      desktopLabel: "기한 초과",
      mobileLabel: "기한 초과",
    });
  });

  it("KST 기준 오늘과 내일을 구분한다", () => {
    expect(
      getTaskDeadlinePresentation("2026-07-27T03:00:00.000Z", NOW),
    ).toEqual({
      kind: "urgent",
      desktopLabel: "오늘 마감",
      mobileLabel: "오늘 마감",
    });
    expect(
      getTaskDeadlinePresentation("2026-07-28T14:59:59.999Z", NOW),
    ).toEqual({
      kind: "urgent",
      desktopLabel: "내일 마감",
      mobileLabel: "내일 마감",
    });
  });

  it("KST 모레부터 실제 날짜와 D-day를 표시한다", () => {
    expect(
      getTaskDeadlinePresentation("2026-07-29T00:00:00.000Z", NOW),
    ).toEqual({
      kind: "standard",
      desktopLabel: "7월 29일 · D-2",
      mobileLabel: "7/29 · D-2",
    });
  });

  it("KST 실제 날짜와 KST day ordinal 차이를 사용한다", () => {
    expect(
      getTaskDeadlinePresentation("2026-07-31T14:59:59.999Z", NOW),
    ).toEqual({
      kind: "standard",
      desktopLabel: "7월 31일 · D-4",
      mobileLabel: "7/31 · D-4",
    });
  });

  it.each([null, undefined, "", "잘못된 날짜"])(
    "deadline %s는 표시 정보를 반환하지 않는다",
    (deadline) => {
      expect(getTaskDeadlinePresentation(deadline, NOW)).toBeNull();
    },
  );
});
