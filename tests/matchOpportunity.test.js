import assert from "node:assert/strict";
import test from "node:test";

import { matchOpportunity } from "../src/services/matchOpportunity.js";

const profile = {
  id: "profile-test",
  updatedAt: "2026-07-15T00:00:00.000Z",
  school: "경북대학교",
  grade: 2,
  majors: ["컴퓨터학부", "수학"],
  interests: ["AI", "소프트웨어", "공모전"],
  regions: ["대구", "온라인"],
  canJoinTeam: true,
  availableHoursPerWeek: 6,
  gpa: null,
  incomeBracket: null,
  languageScores: [],
};

function createOpportunity(overrides = {}) {
  return {
    title: "테스트 공고",
    organizer: null,
    category: "contest",
    deadline: "2026-08-31",
    target: null,
    eligibility: [],
    preferred: [],
    requiredDocuments: [],
    benefits: [],
    activityPeriod: null,
    sourceUrl: null,
    uncertainFields: [],
    ...overrides,
  };
}

function condition(type, text, required = true) {
  return { type, condition: text, evidence: text, required };
}

test("전국 대학생·2학년·컴퓨터 전공·온라인 조건을 지원 가능으로 판정한다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      eligibility: [
        condition("school", "전국 대학생"),
        condition("grade", "2학년 이상"),
        condition("major", "컴퓨터공학 또는 소프트웨어 관련 전공"),
        condition("region", "온라인 활동"),
      ],
    }),
  });

  assert.equal(match.status, "eligible");
  assert.equal(match.disqualifyingReasons.length, 0);
  assert.ok(match.matchedReasons.length >= 4);
  assert.ok(match.score >= 70);
});

test("필수 학점이 있지만 프로필 학점이 없으면 조건부 가능으로 판정한다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      eligibility: [
        condition("school", "전국 대학생"),
        condition("gpa", "학점 3.5 이상"),
      ],
    }),
  });

  assert.equal(match.status, "conditionally_eligible");
  assert.ok(match.missingInfo.some((item) => item.includes("학점")));
  assert.equal(match.disqualifyingReasons.length, 0);
});

test("서울 소재 대학 필수 조건은 경북대학교 프로필에 지원 불가로 판정한다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      eligibility: [condition("school", "서울 소재 대학 재학생만 가능")],
    }),
  });

  assert.equal(match.status, "not_eligible");
  assert.ok(match.disqualifyingReasons.some((item) => item.includes("서울")));
  assert.ok(match.score <= 35);
});

test("공고의 지원 대상과 필수 조건이 없으면 정보 부족으로 판정한다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      uncertainFields: ["지원 대상", "지원 조건"],
    }),
  });

  assert.equal(match.status, "insufficient_info");
  assert.ok(match.missingInfo.some((item) => item.includes("필수 지원 조건")));
});

test("우대 전공 미충족은 지원 불가 사유로 사용하지 않는다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      eligibility: [condition("school", "전국 대학생")],
      preferred: [{ condition: "디자인 전공자 우대", evidence: "디자인 전공자 우대" }],
    }),
  });

  assert.equal(match.status, "eligible");
  assert.equal(match.disqualifyingReasons.length, 0);
  assert.equal(match.matchedReasons.some((item) => item.includes("디자인")), false);
});

test("팀 참가 필수인데 팀 참여가 불가능하면 지원 불가로 판정한다", () => {
  const match = matchOpportunity({
    profile: { ...profile, canJoinTeam: false },
    opportunity: createOpportunity({
      eligibility: [condition("team", "팀 참가 필수")],
    }),
  });

  assert.equal(match.status, "not_eligible");
  assert.ok(match.disqualifyingReasons.some((item) => item.includes("팀 참가")));
});
