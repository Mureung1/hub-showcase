// scoreEligibility()의 TDD 테스트. 구현(score.js)보다 먼저 쓴다 - fixture로 정답과 예측을 고정해두고
// 정밀도·재현율이 손으로 계산한 값과 맞는지 본다.
//   node --test scripts/score.test.js
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreEligibility } from "./score.js";

test("배열 필드: 정확히 일치하면 정밀도·재현율 둘 다 1", () => {
  const items = [{ 코드가_뽑은값: { regions: ["부산"] }, gold: { regions: ["부산"] } }];
  const r = scoreEligibility(items);
  assert.equal(r.regions.precision, 1);
  assert.equal(r.regions.recall, 1);
});

test("배열 필드: 코드가 틀린 지역을 더 뽑으면(오탐) 정밀도만 떨어진다", () => {
  // 코드: [부산, 서울] 예측, 정답: [부산]만. TP=1(부산), FP=1(서울), FN=0.
  const items = [{ 코드가_뽑은값: { regions: ["부산", "서울"] }, gold: { regions: ["부산"] } }];
  const r = scoreEligibility(items);
  assert.equal(r.regions.precision, 0.5); // 1/(1+1)
  assert.equal(r.regions.recall, 1); // 1/(1+0)
});

test("배열 필드: 코드가 놓치면(미탐) 재현율만 떨어진다", () => {
  // 코드: [] 예측(무관으로 뽑음), 정답: [부산]. TP=0, FP=0, FN=1.
  const items = [{ 코드가_뽑은값: { regions: [] }, gold: { regions: ["부산"] } }];
  const r = scoreEligibility(items);
  assert.equal(r.regions.recall, 0);
});

test("스칼라 필드(ageMin): null(무관)도 유효한 정답으로 채점된다", () => {
  const items = [{ 코드가_뽑은값: { ageMin: null }, gold: { ageMin: null } }];
  const r = scoreEligibility(items);
  // 둘 다 무관(빈 집합)이라 예측·정답 다 없음 -> TP+FP=0, TP+FN=0 -> precision/recall은 null(계산 대상 없음)
  assert.equal(r.ageMin.precision, null);
  assert.equal(r.ageMin.recall, null);
  assert.equal(r.ageMin.labeled, 1); // null도 "라벨링 됨"으로 센다("?"만 미채점)
});

test("gold가 \"?\"(미채점)인 필드는 채점에서 빠진다", () => {
  const items = [{ 코드가_뽑은값: { forUniv: true }, gold: { forUniv: "?" } }];
  const r = scoreEligibility(items);
  assert.equal(r.forUniv.labeled, 0);
  assert.equal(r.forUniv.precision, null);
});

test("여러 건 누적: 필드별로 항목을 합쳐서(micro-average) 계산한다", () => {
  const items = [
    { 코드가_뽑은값: { forUniv: true }, gold: { forUniv: true } },  // TP
    { 코드가_뽑은값: { forUniv: true }, gold: { forUniv: false } }, // FP(예측)+FN(정답)
  ];
  const r = scoreEligibility(items);
  assert.equal(r.forUniv.precision, 0.5); // TP=1, FP=1 -> 1/2
  assert.equal(r.forUniv.recall, 0.5); // TP=1, FN=1 -> 1/2
});
