import { test } from "node:test";
import assert from "node:assert/strict";
import { buildExampleSubjects } from "./exampleSubjects.js";
import { getDaysUntil } from "./daysUntil.js";

const TODAY = new Date(2026, 6, 29); // 2026-07-29

test("buildExampleSubjects: 과목 세 개를 준다", () => {
  assert.equal(buildExampleSubjects(TODAY).length, 3);
});

// 고정 날짜를 적어두면 시간이 지나 예시가 전부 "지난 시험"이 된다. 늘 앞날이어야 한다.
test("buildExampleSubjects: 시험일이 모두 오늘 이후다", () => {
  for (const subject of buildExampleSubjects(TODAY)) {
    assert.ok(
      getDaysUntil(subject.examDate, TODAY) > 0,
      `${subject.name} 의 시험일이 지났다: ${subject.examDate}`
    );
  }
});

test("buildExampleSubjects: 임박도가 서로 다르다(급함·보통·여유)", () => {
  const days = buildExampleSubjects(TODAY).map((s) => getDaysUntil(s.examDate, TODAY));
  assert.deepEqual(days, [...new Set(days)], "겹치는 D-day 가 있다");
  assert.ok(Math.max(...days) - Math.min(...days) >= 14, "차이가 너무 작다");
});

test("buildExampleSubjects: 날짜 형식은 YYYY-MM-DD", () => {
  for (const subject of buildExampleSubjects(TODAY)) {
    assert.match(subject.examDate, /^\d{4}-\d{2}-\d{2}$/);
  }
});

// 월·일이 한 자리일 때 0 을 안 채우면 잘못된 날짜가 된다.
test("buildExampleSubjects: 한 자리 월·일도 0 을 채운다", () => {
  const [first] = buildExampleSubjects(new Date(2026, 0, 1));
  assert.match(first.examDate, /^2026-01-0\d$/);
});

test("buildExampleSubjects: 달을 넘겨도 날짜가 맞다", () => {
  const [first] = buildExampleSubjects(new Date(2026, 0, 31));
  assert.equal(first.examDate, "2026-02-02");
});

test("buildExampleSubjects: daysFromToday 는 결과에 남지 않는다", () => {
  for (const subject of buildExampleSubjects(TODAY)) {
    assert.equal("daysFromToday" in subject, false);
  }
});
