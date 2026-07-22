// deriveEnrollment()의 TDD 테스트. 온통청년 API의 ptcpPrpTrgtCn(참여제외대상) 필드에 "재학생"이
// 언급되면(이 필드 자체가 "제외 대상" 목록이라 언급 자체가 제외란 뜻) 재학생은 못 들어간다.
// 재학생만 제외하면 남는 건 {휴학, 졸업예정}이라 그 둘을 허용집합으로 준다. 휴학을 빠뜨리면 휴학생이
// 모든 "재학생 제외" 공고에서 잘못 걸러진다(false negative, 이 프로젝트가 제일 싫어하는 실수).
// 실측: K-뉴딜아카데미·청년미래플러스 원문에서 재학생 제외 확인.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveEnrollment } from "./youthcenter.js";

test("재학생 제외면 휴학·졸업예정이 허용집합 (졸업예정만 아님 - 휴학 안 빠뜨림)", () => {
  const text = "취업중이거나 사업자등록중인 자, 졸업예정자 이외 재학생, 구직등록을 하지 않은 사람";
  assert.deepEqual(deriveEnrollment(text), ["휴학", "졸업예정"]);
});

test("다른 표현(재학생의 참여 제한)도 휴학·졸업예정 허용으로 잡는다", () => {
  const text = "(구직청년 프로그램) 재학생의 참여 제한(졸업예정자는 가능)";
  assert.deepEqual(deriveEnrollment(text), ["휴학", "졸업예정"]);
});

test("졸업예정 문구 없이 재학생만 제외해도 휴학·졸업예정 허용", () => {
  assert.deepEqual(deriveEnrollment("재학생은 신청 불가"), ["휴학", "졸업예정"]);
});

test("재학생 언급이 없으면 무관(빈 배열)", () => {
  assert.deepEqual(deriveEnrollment("한 명의 참여자가 동시에 다수 사업 참여 제한"), []);
});

test("빈 값·null이면 무관(빈 배열)", () => {
  assert.deepEqual(deriveEnrollment(""), []);
  assert.deepEqual(deriveEnrollment(null), []);
});
