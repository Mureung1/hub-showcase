import assert from "node:assert/strict";
import test from "node:test";

import { matchOpportunity } from "../src/services/matchOpportunity.js";

const opportunity = {
  title: "어학 우수 장학금",
  category: "scholarship",
  deadline: null,
  target: null,
  eligibility: [{
    type: "other",
    condition: "토익 800점 이상",
    evidence: "TOEIC 또는 토익 800점 이상 필수",
    required: true,
  }],
  preferred: [],
  requiredDocuments: [],
  benefits: [],
  uncertainFields: ["마감일"],
};

const profile = {
  school: "경북대학교",
  grade: 2,
  majors: ["컴퓨터학부"],
  interests: ["장학금"],
  regions: ["대구"],
  canJoinTeam: true,
  availableHoursPerWeek: null,
  gpa: null,
  incomeBracket: null,
  languageScores: [{ type: "TOEIC", score: "850" }],
};

test("한글 공고의 토익 조건과 영문 TOEIC 프로필을 같은 시험으로 비교한다", () => {
  const match = matchOpportunity({ profile, opportunity });

  assert.equal(match.status, "eligible");
  assert.ok(match.matchedReasons.some((item) => item.includes("850")));
});
