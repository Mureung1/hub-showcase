// deadline.js 테스트. today를 인자로 고정(2026-07-23)해서 시간에 안 흔들리게 한다.
// 과거에 하루 밀리는 버그(Math.ceil)와 D-NaN 버그가 있던 자리라 경계값(오늘·어제·내일)을 집중해서 본다.
import { test, expect } from "vitest";
import { daysLeft, isPast, ddayLabel } from "./deadline.js";

const today = new Date(2026, 6, 23); // 2026-07-23 (월은 0부터라 6 = 7월)

// --- daysLeft ---
test("daysLeft: 오늘 이후 마감은 남은 일수", () => {
  expect(daysLeft("2026-07-25", today)).toBe(2);
});

test("daysLeft: 마감이 오늘이면 0", () => {
  expect(daysLeft("2026-07-23", today)).toBe(0);
});

test("daysLeft: 마감이 어제면 -1", () => {
  expect(daysLeft("2026-07-22", today)).toBe(-1);
});

test("daysLeft: 마감이 내일이면 1", () => {
  expect(daysLeft("2026-07-24", today)).toBe(1);
});

test("daysLeft: 마감 없음(null/빈문자)이면 Infinity", () => {
  expect(daysLeft(null, today)).toBe(Infinity);
  expect(daysLeft("", today)).toBe(Infinity);
});

test("daysLeft: 마감일 하루는 그날 끝까지라 하루 밀리지 않는다", () => {
  // 오늘 마감이면 0이어야 한다(23:59:59까지 살아있음). ceil이었다면 여기서 1이 나오며 밀렸다.
  expect(daysLeft("2026-07-23", today)).toBe(0);
});

// --- isPast ---
test("isPast: 지난 마감은 true", () => {
  expect(isPast("2026-07-22", today)).toBe(true);
});

test("isPast: 오늘 마감은 아직 안 지남(false)", () => {
  expect(isPast("2026-07-23", today)).toBe(false);
});

test("isPast: 내일 마감은 false", () => {
  expect(isPast("2026-07-24", today)).toBe(false);
});

test("isPast: 마감 없음(상시)은 안 지남(false)", () => {
  expect(isPast(null, today)).toBe(false);
});

// --- ddayLabel ---
test("ddayLabel: 마감 없음이면 '상시'", () => {
  expect(ddayLabel(null, today)).toBe("상시");
});

test("ddayLabel: 지난 마감이면 '마감'", () => {
  expect(ddayLabel("2026-07-22", today)).toBe("마감");
});

test("ddayLabel: 오늘 마감이면 '오늘 마감'", () => {
  expect(ddayLabel("2026-07-23", today)).toBe("오늘 마감");
});

test("ddayLabel: 5일 뒤면 'D-5'", () => {
  expect(ddayLabel("2026-07-28", today)).toBe("D-5");
});
