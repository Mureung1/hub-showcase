import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCreditsInput, CREDITS_MIN, CREDITS_MAX } from "./creditsInput.js";

test("parseCreditsInput: 빈 문자열 → 모름(null)", () => {
  assert.deepEqual(parseCreditsInput(""), { ok: true, value: null });
});

test("parseCreditsInput: 공백만 있어도 모름(null)", () => {
  assert.deepEqual(parseCreditsInput("   "), { ok: true, value: null });
});

test("parseCreditsInput: 정수 학점 → 숫자로 변환", () => {
  assert.deepEqual(parseCreditsInput("3"), { ok: true, value: 3 });
});

test("parseCreditsInput: 0.5 단위 소수도 허용", () => {
  assert.deepEqual(parseCreditsInput("7.5"), { ok: true, value: 7.5 });
});

test("parseCreditsInput: 앞뒤 공백은 무시하고 읽는다", () => {
  assert.deepEqual(parseCreditsInput(" 3 "), { ok: true, value: 3 });
});

test(`parseCreditsInput: 최솟값 ${CREDITS_MIN} 은 허용`, () => {
  assert.deepEqual(parseCreditsInput(String(CREDITS_MIN)), { ok: true, value: CREDITS_MIN });
});

test(`parseCreditsInput: 최댓값 ${CREDITS_MAX} 은 허용`, () => {
  assert.deepEqual(parseCreditsInput(String(CREDITS_MAX)), { ok: true, value: CREDITS_MAX });
});

test("parseCreditsInput: 범위보다 작으면 실패", () => {
  const result = parseCreditsInput("0");
  assert.equal(result.ok, false);
  assert.match(result.message, /0.5~30/);
});

test("parseCreditsInput: 범위보다 크면 실패", () => {
  assert.equal(parseCreditsInput("31").ok, false);
});

test("parseCreditsInput: 음수는 실패", () => {
  assert.equal(parseCreditsInput("-3").ok, false);
});

test("parseCreditsInput: 숫자가 아니면 실패", () => {
  assert.equal(parseCreditsInput("세 학점").ok, false);
});

// 0 은 "모르겠다"가 아니라 잘못된 학점이다. 빈 값(null)과 구분돼야 한다.
test("parseCreditsInput: 0 은 빈 값과 달리 실패로 본다", () => {
  assert.equal(parseCreditsInput("0").ok, false);
  assert.equal(parseCreditsInput("").ok, true);
});

test("parseCreditsInput: 문자열이 아닌 값(undefined)도 모름으로 본다", () => {
  assert.deepEqual(parseCreditsInput(undefined), { ok: true, value: null });
});
