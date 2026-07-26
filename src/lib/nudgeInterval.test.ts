import { describe, it, expect } from "vitest";
import { getUrgencyBucket, getLevelDelayMinutes, getNextCheckDelayMinutes } from "./nudgeInterval.js";

// date-fns의 differenceInCalendarDays는 로컬 달력일 기준이라(nudgeMessages.js의
// formatDday와 동일 원칙), 타임존에 따라 결과가 흔들리지 않도록 "Z"(UTC) 없는
// 로컬 시각 문자열로 테스트 날짜를 구성한다(historyGrouping.test.ts와 동일 관례).
const NOW = new Date("2026-07-22T12:00:00");

describe("getUrgencyBucket", () => {
  it("D-7 이상이면 far를 반환한다 (경계)", () => {
    expect(getUrgencyBucket("2026-07-29T12:00:00", NOW)).toBe("far");
  });

  it("D-3~6이면 soon을 반환한다 (경계)", () => {
    expect(getUrgencyBucket("2026-07-28T12:00:00", NOW)).toBe("soon");
    expect(getUrgencyBucket("2026-07-25T12:00:00", NOW)).toBe("soon");
  });

  it("D-1~2이면 close를 반환한다 (경계)", () => {
    expect(getUrgencyBucket("2026-07-24T12:00:00", NOW)).toBe("close");
    expect(getUrgencyBucket("2026-07-23T12:00:00", NOW)).toBe("close");
  });

  it("당일이거나 이미 지났으면 overdue를 반환한다 (경계)", () => {
    expect(getUrgencyBucket("2026-07-22T23:00:00", NOW)).toBe("overdue");
    expect(getUrgencyBucket("2026-07-20T00:00:00", NOW)).toBe("overdue");
  });

  it("deadline이 없으면 far로 안전하게 폴백한다 (경계)", () => {
    expect(getUrgencyBucket(null, NOW)).toBe("far");
    expect(getUrgencyBucket(undefined, NOW)).toBe("far");
  });

  it("deadline이 유효하지 않은 날짜여도 far로 안전하게 폴백한다 (경계)", () => {
    expect(getUrgencyBucket("이건-날짜가-아님", NOW)).toBe("far");
  });
});

describe("getLevelDelayMinutes", () => {
  it("레벨 1은 모든 구간에서 0(즉시)을 반환한다 (경계)", () => {
    expect(getLevelDelayMinutes(1, "far")).toBe(0);
    expect(getLevelDelayMinutes(1, "overdue")).toBe(0);
  });

  it("구간별로 레벨 2/3/4의 지연 값이 다르게 정의돼 있다 (happy path)", () => {
    expect(getLevelDelayMinutes(2, "far")).toBe(30);
    expect(getLevelDelayMinutes(3, "far")).toBe(60);
    expect(getLevelDelayMinutes(4, "far")).toBe(120);
    expect(getLevelDelayMinutes(4, "overdue")).toBe(15);
  });

  it("정의되지 않은 레벨은 안전하게 0을 반환한다 (경계)", () => {
    expect(getLevelDelayMinutes(0, "far")).toBe(0);
    expect(getLevelDelayMinutes(5, "far")).toBe(0);
  });
});

describe("getNextCheckDelayMinutes", () => {
  it("currentLevel이 0(막 활성화)이면 다음 체크(Lv1)는 즉시다 (happy path)", () => {
    expect(getNextCheckDelayMinutes(0, "2026-07-29T12:00:00", NOW)).toBe(0);
  });

  it("currentLevel이 1이면 Lv2 지연을 긴급도 구간에 맞춰 반환한다 (happy path)", () => {
    expect(getNextCheckDelayMinutes(1, "2026-07-29T12:00:00", NOW)).toBe(30); // far
    expect(getNextCheckDelayMinutes(1, "2026-07-20T12:00:00", NOW)).toBe(5); // overdue
  });

  it("currentLevel이 이미 4면 계속 Lv4 지연을 재사용한다 (경계, 휴지기 없음)", () => {
    expect(getNextCheckDelayMinutes(4, "2026-07-29T12:00:00", NOW)).toBe(120);
  });
});
