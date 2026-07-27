import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildStudyPlan,
  formatMinutes,
  MIN_BLOCK_MINUTES,
} from "./studyPlan.js";

// 테스트 기준 날짜를 고정한다. (오늘 날짜에 따라 D-day 가 달라지면 테스트가 흔들린다)
const TODAY = new Date(2026, 6, 27); // 2026-07-27

function subject(name, priorityScore, examDate = "2026-08-30") {
  return { id: name, name, priorityScore, examDate };
}

test("buildStudyPlan: 점수 비율대로 나누고 합은 준 시간과 같다", () => {
  const plan = buildStudyPlan(
    [subject("자료구조", 80), subject("운영체제", 68), subject("영어", 25)],
    180,
    TODAY
  );

  const sum = plan.blocks.reduce((total, block) => total + block.minutes, 0);
  assert.equal(sum, 180);
  assert.equal(plan.blocks.length, 3);
});

test("buildStudyPlan: 점수가 높은 과목이 더 많은 시간을 받는다", () => {
  const plan = buildStudyPlan(
    [subject("자료구조", 80), subject("운영체제", 68), subject("영어", 25)],
    180,
    TODAY
  );

  const minutes = plan.blocks.map((block) => block.minutes);
  assert.deepEqual(minutes, [...minutes].sort((a, b) => b - a));
});

// 7분 23초 같은 값은 계획으로 못 쓴다. 10분 단위로 떨어져야 한다.
test("buildStudyPlan: 모든 시간이 10분 단위로 떨어진다", () => {
  const plan = buildStudyPlan(
    [subject("가", 73), subject("나", 51), subject("다", 44)],
    155,
    TODAY
  );

  for (const block of plan.blocks) {
    assert.equal(block.minutes % 10, 0, `${block.name} ${block.minutes}분`);
  }
});

// 5분씩 세 과목에 흩뿌리면 어느 것도 자리에 앉을 수 없다.
test("buildStudyPlan: 최소 블록을 못 채우는 과목은 오늘 계획에서 빠진다", () => {
  const plan = buildStudyPlan(
    [subject("자료구조", 80), subject("운영체제", 68), subject("영어", 25)],
    60,
    TODAY
  );

  for (const block of plan.blocks) {
    assert.ok(block.minutes >= MIN_BLOCK_MINUTES, `${block.name} ${block.minutes}분`);
  }
  assert.deepEqual(plan.skipped.map((s) => s.name), ["영어"]);
});

// 빠진 과목을 조용히 지우면 사용자는 그 과목이 있었다는 것도 모른다.
test("buildStudyPlan: 빠진 과목도 목록으로 돌려준다", () => {
  const plan = buildStudyPlan(
    [subject("가", 90), subject("나", 10), subject("다", 8)],
    40,
    TODAY
  );

  const planned = plan.blocks.map((b) => b.name);
  const skipped = plan.skipped.map((s) => s.name);
  assert.deepEqual([...planned, ...skipped].sort(), ["가", "나", "다"]);
});

// "완전히 모르는 과목이 생기지 않도록" — 시험이 코앞인데 빠지면 알려줘야 한다.
test("buildStudyPlan: 시험이 임박한 과목이 빠지면 isSoon 으로 표시한다", () => {
  const plan = buildStudyPlan(
    [subject("자료구조", 90, "2026-08-30"), subject("영어", 8, "2026-07-29")],
    40,
    TODAY
  );

  const english = plan.skipped.find((s) => s.name === "영어");
  assert.ok(english, "영어가 빠진 목록에 있어야 한다");
  assert.equal(english.isSoon, true);
  assert.equal(english.daysUntil, 2);
});

test("buildStudyPlan: 시험이 멀리 있는 과목이 빠지면 isSoon 은 false", () => {
  const plan = buildStudyPlan(
    [subject("자료구조", 90, "2026-08-30"), subject("영어", 8, "2026-12-20")],
    40,
    TODAY
  );

  assert.equal(plan.skipped.find((s) => s.name === "영어").isSoon, false);
});

test("buildStudyPlan: 최소 블록보다 적은 시간이면 계획을 세우지 않는다", () => {
  const plan = buildStudyPlan([subject("가", 80)], 10, TODAY);
  assert.deepEqual(plan.blocks, []);
});

test("buildStudyPlan: 과목이 없으면 빈 계획", () => {
  const plan = buildStudyPlan([], 180, TODAY);
  assert.deepEqual(plan.blocks, []);
  assert.deepEqual(plan.skipped, []);
});

// 아는 게 하나도 없어 점수가 0인 과목은 나눌 근거가 없다.
test("buildStudyPlan: 점수가 모두 0이면 계획을 세우지 않는다", () => {
  const plan = buildStudyPlan([subject("가", 0), subject("나", 0)], 180, TODAY);
  assert.deepEqual(plan.blocks, []);
  assert.equal(plan.skipped.length, 2);
});

test("buildStudyPlan: 과목이 하나면 시간을 전부 준다", () => {
  const plan = buildStudyPlan([subject("가", 80)], 90, TODAY);
  assert.equal(plan.blocks.length, 1);
  assert.equal(plan.blocks[0].minutes, 90);
});

test("formatMinutes: 60분 미만이면 분만 표시", () => {
  assert.equal(formatMinutes(40), "40분");
});

test("formatMinutes: 정각이면 시간만 표시", () => {
  assert.equal(formatMinutes(120), "2시간");
});

test("formatMinutes: 시간과 분을 함께 표시", () => {
  assert.equal(formatMinutes(90), "1시간 30분");
});
