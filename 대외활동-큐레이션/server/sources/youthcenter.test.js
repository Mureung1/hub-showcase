// deriveEnrollment()의 TDD 테스트. 온통청년 API의 ptcpPrpTrgtCn(참여제외대상) 필드에 "재학생"이
// 언급되면(이 필드 자체가 "제외 대상" 목록이라 언급 자체가 제외란 뜻) 재학생은 못 들어가고, "졸업예정"
// 예외가 같이 있으면 졸업예정자만 가능하다고 본다. 실측: K-뉴딜아카데미·청년미래플러스 원문에서 확인.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveEnrollment } from "./youthcenter.js";

test("재학생 제외 + 졸업예정자 예외 문구가 있으면 졸업예정만 가능", () => {
  const text = "취업중이거나 사업자등록중인 자, 졸업예정자 이외 재학생, 구직등록을 하지 않은 사람";
  assert.deepEqual(deriveEnrollment(text), ["졸업예정"]);
});

test("다른 표현(재학생의 참여 제한, 졸업예정자는 가능)도 졸업예정만 가능으로 잡는다", () => {
  const text = "(구직청년 프로그램) 재학생의 참여 제한(졸업예정자는 가능)";
  assert.deepEqual(deriveEnrollment(text), ["졸업예정"]);
});

test("재학생 언급이 없으면 무관(빈 배열)", () => {
  assert.deepEqual(deriveEnrollment("한 명의 참여자가 동시에 다수 사업 참여 제한"), []);
});

test("빈 값·null이면 무관(빈 배열)", () => {
  assert.deepEqual(deriveEnrollment(""), []);
  assert.deepEqual(deriveEnrollment(null), []);
});
