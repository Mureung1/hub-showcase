import { createTasks } from "./createTasks.js";
import { analyzeResponseSchema } from "../schemas/analyzeSchemas.js";
import { normalizeAnalysisResult } from "../../src/utils/normalizeAnalysisResult.js";
import { matchOpportunity } from "../../src/services/matchOpportunity.js";

function firstNonEmptyLine(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || null;
}

function inferCategory(text) {
  if (/장학|학자금|등록금|생활비/.test(text)) {
    return "scholarship";
  }

  if (/공모전|해커톤|경진대회|대회/.test(text)) {
    return "contest";
  }

  if (/봉사|자원활동/.test(text)) {
    return "volunteer";
  }

  if (/지원사업|지원금|바우처|사업화|창업/.test(text)) {
    return "support";
  }

  if (/대외활동|서포터즈|멘토링|교육|캠프/.test(text)) {
    return "activity";
  }

  return "unknown";
}

function findField(text, labelPattern) {
  const pattern = new RegExp(`(?:${labelPattern})\\s*[:：]\\s*([^\\n]+)`, "i");
  return text.match(pattern)?.[1]?.trim() || null;
}

function splitList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[,،，]|ㆍ|·|\//)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractDeadline(text) {
  return (
    text.match(/(?:접수\s*)?마감\s*[:：]?\s*((?:20\d{2}\s*년\s*)?\d{1,2}\s*월\s*\d{1,2}\s*일?)/)?.[1]?.trim() ||
    text.match(/(20\d{2}[-./]\d{1,2}[-./]\d{1,2})/)?.[1]?.trim() ||
    null
  );
}

function includesAny(text, values) {
  return values.some((value) => value && text.includes(value));
}

function estimateEligibility({ profile, rawText, target, category }) {
  const matchedReasons = [];
  const missingInfo = [];
  const disqualifyingReasons = [];
  const eligibility = [];
  const text = rawText.replace(/\s+/g, " ");

  if (profile.school && text.includes(profile.school)) {
    matchedReasons.push(`${profile.school} 재학생 조건과 일치합니다.`);
    eligibility.push({
      type: "school",
      condition: `${profile.school} 소속`,
      evidence: profile.school,
      required: true,
    });
  } else if (/전국\s*대학교|대학생|재학생/.test(text)) {
    matchedReasons.push("대학생 또는 재학생 대상 공고입니다.");
    eligibility.push({
      type: "school",
      condition: "대학교 재학생",
      evidence: text.match(/전국\s*대학교|대학생|재학생/)?.[0] || "재학생",
      required: true,
    });
  } else {
    missingInfo.push("소속 학교 조건");
  }

  const gradeMatch = text.match(/(\d)\s*학년\s*이상/);
  if (gradeMatch) {
    const minimumGrade = Number(gradeMatch[1]);
    eligibility.push({
      type: "grade",
      condition: `${minimumGrade}학년 이상`,
      evidence: gradeMatch[0],
      required: true,
    });

    if (!Number.isInteger(profile.grade)) {
      missingInfo.push("사용자 학년 정보");
    } else if (profile.grade >= minimumGrade) {
      matchedReasons.push(`${profile.grade}학년으로 학년 조건을 충족합니다.`);
    } else {
      disqualifyingReasons.push(`${minimumGrade}학년 이상 조건에 미달합니다.`);
    }
  } else {
    missingInfo.push("학년 조건");
  }

  if (includesAny(text, profile.majors)) {
    matchedReasons.push("전공 키워드가 공고의 우대 또는 대상 조건과 맞습니다.");
  }

  const majorEvidence = profile.majors.find((major) => text.includes(major)) || text.match(/컴퓨터공학|인공지능|소프트웨어|AI|SW/)?.[0];
  if (majorEvidence) {
    eligibility.push({
      type: "major",
      condition: "관련 전공 또는 관심 분야",
      evidence: majorEvidence,
      required: false,
    });
  } else if (category !== "unknown") {
    missingInfo.push("전공 제한 여부");
  }

  if (includesAny(text, profile.regions) || /온라인/.test(text)) {
    matchedReasons.push("활동 지역 조건이 프로필의 선호 지역과 맞습니다.");
    eligibility.push({
      type: "region",
      condition: "활동 가능 지역",
      evidence: profile.regions.find((region) => text.includes(region)) || "온라인",
      required: false,
    });
  }

  if (/팀\s*참가/.test(text)) {
    eligibility.push({
      type: "team",
      condition: "팀 참가 가능",
      evidence: text.match(/팀\s*참가[^,.\n]*/)?.[0] || "팀 참가 가능",
      required: false,
    });

    if (profile.canJoinTeam) {
      matchedReasons.push("팀 참가 가능 조건과 맞습니다.");
    }
  }

  if (!target) {
    missingInfo.push("지원 대상 세부 조건");
  }

  return {
    eligibility,
    matchedReasons,
    missingInfo: Array.from(new Set(missingInfo)),
    disqualifyingReasons,
  };
}

function estimatePreferred(text) {
  const preferred = [];
  const preferredLine = findField(text, "우대|우대 조건|관련 전공자 우대");

  if (preferredLine) {
    preferred.push({ condition: preferredLine, evidence: preferredLine });
  } else if (/우대/.test(text)) {
    const evidence = text.match(/[^.\n]*우대[^.\n]*/)?.[0]?.trim() || "우대 조건 언급";
    preferred.push({ condition: evidence, evidence });
  }

  return preferred;
}

export async function mockAnalyzeOpportunity({ profile, rawText, url }) {
  const safeProfile = profile || {
    school: "",
    grade: null,
    majors: [],
    interests: [],
    regions: [],
    canJoinTeam: null,
    availableHoursPerWeek: null,
    gpa: null,
    incomeBracket: null,
    languageScores: [],
  };
  const category = inferCategory(rawText);
  const title = firstNonEmptyLine(rawText);
  const organizer = findField(rawText, "주최|주관|운영 기관|기관");
  const deadline = extractDeadline(rawText);
  const target = findField(rawText, "대상|지원 대상|참가 대상");
  const requiredDocuments = splitList(findField(rawText, "제출 서류|필수 서류|서류"));
  const benefits = splitList(findField(rawText, "혜택|시상|지원 내용"));
  const activityPeriod = findField(rawText, "활동 기간|운영 기간|사업 기간");
  const uncertainFields = [];

  if (!deadline) uncertainFields.push("마감일");
  if (!organizer) uncertainFields.push("주최 기관");
  if (!target) uncertainFields.push("지원 대상");
  if (!requiredDocuments.length) uncertainFields.push("제출 서류");
  if (!benefits.length) uncertainFields.push("혜택");
  if (!activityPeriod) uncertainFields.push("활동 기간");

  const eligibilitySignals = estimateEligibility({
    profile: safeProfile,
    rawText,
    target,
    category,
  });
  const opportunity = {
    title,
    organizer,
    category,
    deadline,
    target,
    eligibility: eligibilitySignals.eligibility,
    preferred: estimatePreferred(rawText),
    requiredDocuments,
    benefits,
    activityPeriod,
    sourceUrl: url || null,
    uncertainFields,
  };
  const match = matchOpportunity({ profile, opportunity, sourceText: rawText });

  const result = {
    mode: "mock",
    opportunity,
    match,
    tasks: createTasks(opportunity, match),
  };

  return analyzeResponseSchema.parse(normalizeAnalysisResult(result));
}
