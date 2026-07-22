// deriveRegionFromDistrict()의 TDD 테스트. 구현(regionLookup.js)보다 먼저 쓴다.
//   node --test regionLookup.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveRegionFromDistrict } from "./regionLookup.js";

test("서울에만 있는 구 이름(영등포구)이 원문에 있으면 서울로 매핑된다", () => {
  assert.deepEqual(deriveRegionFromDistrict("영등포구민, 영등포구청 직원"), ["서울"]);
});

test("부산에만 있는 구 이름(해운대구)이 있으면 부산으로 매핑된다", () => {
  assert.deepEqual(deriveRegionFromDistrict("해운대구 거주자만 지원 가능"), ["부산"]);
});

test("여러 도시에 같은 이름이 있는 구(중구)는 판별하지 않는다(빈 배열)", () => {
  assert.deepEqual(deriveRegionFromDistrict("중구 주민만 지원 가능"), []);
});

test("구·군 이름이 아예 없으면 빈 배열(무관)", () => {
  assert.deepEqual(deriveRegionFromDistrict("전국 대학생 누구나 지원 가능"), []);
});

test("빈 값·null이면 안 터지고 빈 배열(무관)", () => {
  assert.deepEqual(deriveRegionFromDistrict(""), []);
  assert.deepEqual(deriveRegionFromDistrict(null), []);
});

test("서로 다른 시도의 구가 둘 다 있으면(드물지만) 둘 다 반환한다", () => {
  const result = deriveRegionFromDistrict("영등포구 또는 해운대구 거주자");
  assert.equal(result.includes("서울"), true);
  assert.equal(result.includes("부산"), true);
  assert.equal(result.length, 2);
});
