import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPriorityReason } from "./priorityReason.js";

// 급함 비중이 큰 "임박도 중시" 성향에서, 임박한 시험은 이유에 반드시 포함된다.
test("buildPriorityReason: 임박도 중시 성향에서 임박한 시험은 이유에 포함", () => {
  const soon = new Date();
  soon.setDate(soon.getDate() + 2); // 오늘로부터 2일 뒤 (오늘 날짜 기준이라 상대적으로 계산)
  const examDate = soon.toISOString().slice(0, 10);

  const subject = {
    examDate,
    understanding: 3,
    difficulty: 3,
    gradeWeight: 40,
    grading: 3,
    studyAmount: 3,
    availableTime: 3,
  };
  const reason = buildPriorityReason(subject, "urgency");
  assert.match(reason, /임박/);
});

// 같은 과목이라도 성향(가중치)이 다르면 언급되는 이유도 달라진다.
test("buildPriorityReason: 성향에 따라 언급되는 이유가 달라진다", () => {
  const subject = {
    examDate: "2027-01-01", // 아주 먼 시험 → 급함 기여 없음
    understanding: 3, // 기여도 5~10, 임계값(12) 안 넘음
    difficulty: 1, // 기여도 0, 어느 성향에서도 안 걸림
    gradeWeight: 60, // grade 성향(가중치 0.3→기여18)은 넘고, difficulty 성향(0.15→기여9)은 안 넘게 설계
    grading: 3,
    studyAmount: 3,
    availableTime: 3,
  };
  const gradeReason = buildPriorityReason(subject, "grade");
  const difficultyReason = buildPriorityReason(subject, "difficulty");

  assert.match(gradeReason, /성적 반영 비율/);
  assert.doesNotMatch(difficultyReason, /성적 반영 비율/);
});

// 학점은 이제 다른 요인과 같이 기여도 순으로 다뤄진다.
// 학점만 유난히 높고 나머지가 평범하면, 학점이 이유로 올라와야 한다.
test("buildPriorityReason: 학점이 높으면 이유에 학점 수가 나온다", () => {
  const subject = {
    examDate: "2027-01-01",
    understanding: 0,
    difficulty: 0,
    gradeWeight: null,
    grading: 0,
    studyAmount: 0,
    availableTime: 0,
    previousScore: null,
    credits: 7.5,
  };
  const reason = buildPriorityReason(subject, "balanced");
  assert.match(reason, /7\.5학점/);
});

// 학점을 안 넣었으면 이유로 말하지 않는다.
test("buildPriorityReason: 학점을 모르면 이유에 나오지 않는다", () => {
  const subject = {
    examDate: "2027-01-01",
    understanding: 1,
    difficulty: 0,
    gradeWeight: null,
    grading: 0,
    studyAmount: 0,
    availableTime: 0,
    previousScore: null,
    credits: null,
  };
  assert.doesNotMatch(buildPriorityReason(subject, "balanced"), /학점/);
});

// 급한 이유가 하나도 없으면 "여유" 문장을 반환한다.
test("buildPriorityReason: 급한 이유가 없으면 여유 문장 반환", () => {
  const subject = {
    examDate: "2027-06-01",
    understanding: 5,
    difficulty: 1,
    gradeWeight: 0,
    grading: 1,
    studyAmount: 1,
    availableTime: 5,
  };
  const reason = buildPriorityReason(subject, "balanced");
  assert.match(reason, /여유|서두르지 않아도/);
});
