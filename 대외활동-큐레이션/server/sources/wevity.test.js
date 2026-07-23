// ddayToDate 테스트. 원래는 함수 안에서 new Date()(오늘)를 직접 써서 결정적 테스트가 안 됐다.
// today를 인자로 받게 리팩터한 뒤(자료: 테스트하기 쉬운 구조로), 고정 날짜(2026-07-23)로 검증한다.
//   node --test sources/wevity.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { ddayToDate } from "./wevity.js";

const today = new Date(2026, 6, 23); // 2026-07-23

test("D-13이면 13일 뒤 날짜", () => {
  assert.equal(ddayToDate("D-13", today), "2026-08-05");
});

test("D-0이면 오늘", () => {
  assert.equal(ddayToDate("D-0", today), "2026-07-23");
});

test("D-1이면 다음날", () => {
  assert.equal(ddayToDate("D-1", today), "2026-07-24");
});

test("D-DAY면 오늘", () => {
  assert.equal(ddayToDate("D-DAY", today), "2026-07-23");
});

test("공백 섞인 'D - DAY'도 오늘(공백 제거 후 매칭)", () => {
  assert.equal(ddayToDate("D - DAY", today), "2026-07-23");
});

test("대소문자 무관: 'd-5'도 5일 뒤", () => {
  assert.equal(ddayToDate("d-5", today), "2026-07-28");
});

test("D 패턴 없으면(상시모집) null", () => {
  assert.equal(ddayToDate("상시모집", today), null);
});

test("빈 값·null이면 null", () => {
  assert.equal(ddayToDate("", today), null);
  assert.equal(ddayToDate(null, today), null);
});
