import { test } from "node:test";
import assert from "node:assert/strict";
import { isCompleted, splitByStatus } from "./subjectStatus.js";

// 완료 여부: completedAt 값이 있으면 완료, 없으면 활성.
test("isCompleted: completedAt 값이 있으면 완료(true)", () => {
  assert.equal(isCompleted({ id: 1, completedAt: "2026-07-23 10:00:00" }), true);
});

test("isCompleted: completedAt 이 null 이면 미완료(false)", () => {
  assert.equal(isCompleted({ id: 1, completedAt: null }), false);
});

test("isCompleted: completedAt 필드가 없으면 미완료(false)", () => {
  assert.equal(isCompleted({ id: 1 }), false);
});

// completedAt 은 완료 시각 문자열(예: "2026-07-23 10:00:00")이다.
// 빈 문자열 등 유효하지 않은 값은 "완료된 게 아니다"로 본다. (명세 확정)
test("isCompleted: completedAt 이 빈 문자열이면 미완료(false)", () => {
  assert.equal(isCompleted({ id: 1, completedAt: "" }), false);
});

test("isCompleted: subject 가 undefined 여도 안전하게 false", () => {
  assert.equal(isCompleted(undefined), false);
});

// 활성/완료 목록 분리.
test("splitByStatus: 활성과 완료를 나눈다", () => {
  const subjects = [
    { id: 1, completedAt: null },
    { id: 2, completedAt: "2026-07-23 10:00:00" },
    { id: 3, completedAt: null },
  ];

  const { active, completed } = splitByStatus(subjects);

  assert.deepEqual(active.map((s) => s.id), [1, 3]);
  assert.deepEqual(completed.map((s) => s.id), [2]);
});

test("splitByStatus: 빈 배열이면 둘 다 빈 배열", () => {
  const { active, completed } = splitByStatus([]);
  assert.deepEqual(active, []);
  assert.deepEqual(completed, []);
});

test("splitByStatus: 원본 순서를 유지한다", () => {
  const subjects = [
    { id: 10, completedAt: null },
    { id: 20, completedAt: null },
  ];
  const { active } = splitByStatus(subjects);
  assert.deepEqual(active.map((s) => s.id), [10, 20]);
});
