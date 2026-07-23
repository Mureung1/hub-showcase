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

test("기업만 모집하는 공고는 학생 프로필에 무조건 0점으로 판정한다", () => {
  const sourceText = `2026년도 대학-기업 협업 프로젝트 참여기업 2차모집 공고
지원대상: 대구 지역 내 모빌리티 및 ABB 관련 기업, 또는 해당 분야로 업종 전환을 추진하는 기업`;
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      title: "2026년도 대학-기업 협업 프로젝트 참여기업 2차모집 공고",
      category: "support",
      target: "대구 지역 내 모빌리티 및 ABB 관련 기업",
      eligibility: [condition("other", "대구 지역 내 관련 기업")],
    }),
    sourceText,
  });

  assert.equal(match.status, "not_eligible");
  assert.equal(match.score, 0);
  assert.ok(match.disqualifyingReasons.some((item) => item.includes("기업")));
  assert.deepEqual(match.matchedReasons, []);
});

test("기업이 언급되어도 실제 모집 대상이 대학생이면 기업 전용으로 오판하지 않는다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      title: "기업 연계 대학생 인턴십 참가자 모집",
      target: "전국 대학교 재학생",
      eligibility: [condition("school", "전국 대학교 재학생")],
    }),
    sourceText: "기업 실무 프로젝트에 참여할 전국 대학교 재학생을 모집합니다.",
  });

  assert.equal(match.status, "eligible");
  assert.notEqual(match.score, 0);
  assert.equal(match.disqualifyingReasons.length, 0);
});
test("AI가 target을 놓쳐도 원문 지원대상으로 기업 전용을 판정한다", () => {
  const match = matchOpportunity({
    profile,
    opportunity: createOpportunity({
      title: "지역 신산업 사업화 지원 공고",
      category: "support",
      target: null,
      eligibility: [],
    }),
    sourceText: "지원대상: 대구 지역 내 ABB 관련 기업 또는 업종 전환을 추진하는 기업",
  });

  assert.equal(match.status, "not_eligible");
  assert.equal(match.score, 0);
  assert.match(match.disqualifyingReasons[0], /지원대상.*기업/);
});