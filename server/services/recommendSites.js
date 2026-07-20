import {
  SITE_INFORMATION_LABELS,
  SITE_INFORMATION_TYPES,
} from "../../src/constants/siteRecommendations.js";

const INFORMATION_TYPE_SET = new Set(SITE_INFORMATION_TYPES);
const SCORE_WEIGHTS = Object.freeze({
  desiredMatch: 9,
  interestMatch: 4,
  majorMatch: 8,
  missingCoverageMatch: 14,
  officialProvider: 4,
  regionMatch: 4,
  trusted: 6,
  overlapPenalty: 2,
});
const MAX_RECOMMENDATIONS = 6;

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function intersect(left, right) {
  const rightSet = new Set(right);
  return unique(left.filter((value) => rightSet.has(value)));
}

function includesAny(value, keywords) {
  const normalized = String(value || "").toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function mapTextToInformationTypes(values) {
  const text = values.join(" ").toLowerCase();
  const types = [];

  if (includesAny(text, ["장학", "학자금"])) types.push("scholarship");
  if (includesAny(text, ["공모", "해커톤", "contest"])) types.push("contest");
  if (includesAny(text, ["봉사", "volunteer"])) types.push("volunteer");
  if (includesAny(text, ["인턴", "internship"])) types.push("internship");
  if (includesAny(text, ["취업", "채용", "구직", "employment"])) types.push("employment");
  if (includesAny(text, ["연구", "research", "ai", "인공지능", "소프트웨어", "컴퓨터", "개발"])) {
    types.push("research", "education", "contest");
  }
  if (includesAny(text, ["교육", "훈련", "강좌", "특강"])) types.push("education");
  if (includesAny(text, ["창업", "지원", "정책"])) types.push("support");
  if (includesAny(text, ["대외활동", "활동", "program"])) types.push("activity");

  return unique(types).filter((type) => INFORMATION_TYPE_SET.has(type));
}

function inferDesiredInformation(profile, keyword) {
  const values = [
    ...(profile?.interests ?? []),
    ...(profile?.majors ?? []),
    keyword || "",
  ];
  const inferred = mapTextToInformationTypes(values);

  return inferred.length ? inferred : ["scholarship", "contest", "activity", "support"];
}

function siteMatchesMajor(site, profile) {
  const majors = profile?.majors ?? [];
  if (!majors.length) return false;

  const technicalMajor = majors.some((major) => includesAny(major, [
    "컴퓨터", "소프트웨어", "인공지능", "ai", "데이터", "수학",
  ]));

  return technicalMajor && site.informationTypes.some((type) => [
    "contest", "education", "internship", "research",
  ].includes(type));
}

function siteMatchesRegions(site, profile) {
  const regions = profile?.regions ?? [];
  if (!regions.length) return false;
  if (site.regions.includes("전국") || site.regions.includes("온라인")) return true;
  return intersect(site.regions, regions).length > 0;
}

function buildProfileReasons(site, profile, interestTypes, regionMatch) {
  const reasons = [];
  const interestMatches = intersect(site.informationTypes, interestTypes);

  if (interestMatches.length) {
    reasons.push(`관심 분야와 연결되는 ${interestMatches.map((type) => SITE_INFORMATION_LABELS[type]).join(", ")} 정보를 확인할 수 있습니다.`);
  }
  if (siteMatchesMajor(site, profile)) {
    reasons.push("전공과 연관된 연구·교육·공모전 정보를 함께 확인할 수 있습니다.");
  }
  if (regionMatch) {
    reasons.push("전국 또는 온라인 범위의 정보를 포함해 활동 가능 지역과 함께 검토할 수 있습니다.");
  }

  return reasons;
}

function normalizeTypes(types) {
  return unique(types).filter((type) => INFORMATION_TYPE_SET.has(type));
}

function createCoverage(trackedSites, desiredInformation, recommendations) {
  const currentlyCovered = normalizeTypes(trackedSites.flatMap((site) => site.informationTypes));
  const missingCoverage = desiredInformation.filter((type) => !currentlyCovered.includes(type));
  const newlyCovered = normalizeTypes(
    recommendations.flatMap((recommendation) => recommendation.missingCoverageFilled),
  );

  return {
    currentlyCovered,
    desiredInformation,
    missingCoverage,
    newlyCovered,
    stillMissing: missingCoverage.filter((type) => !newlyCovered.includes(type)),
  };
}

function createRecommendation(site, context) {
  const {
    currentlyCovered,
    desiredInformation,
    interestTypes,
    missingCoverage,
    profile,
  } = context;
  const desiredMatches = intersect(site.informationTypes, desiredInformation);
  const missingMatches = intersect(site.informationTypes, missingCoverage);
  const interestMatches = intersect(site.informationTypes, interestTypes);
  const overlappingInformation = intersect(site.informationTypes, currentlyCovered);
  const majorMatch = siteMatchesMajor(site, profile);
  const regionMatch = siteMatchesRegions(site, profile);
  let score = 0;

  score += desiredMatches.length * SCORE_WEIGHTS.desiredMatch;
  score += missingMatches.length * SCORE_WEIGHTS.missingCoverageMatch;
  score += interestMatches.length * SCORE_WEIGHTS.interestMatch;
  score += majorMatch ? SCORE_WEIGHTS.majorMatch : 0;
  score += regionMatch ? SCORE_WEIGHTS.regionMatch : 0;
  score += site.trusted ? SCORE_WEIGHTS.trusted : 0;
  score += site.providerType !== "private_platform" ? SCORE_WEIGHTS.officialProvider : 0;
  score -= overlappingInformation.length * SCORE_WEIGHTS.overlapPenalty;
  score = Math.max(0, Math.min(100, score));

  const profileReasons = buildProfileReasons(site, profile, interestTypes, regionMatch);
  const complementaryReasons = [];

  if (missingMatches.length) {
    complementaryReasons.push(`현재 추적 범위에서 부족한 ${missingMatches.map((type) => SITE_INFORMATION_LABELS[type]).join(", ")} 정보를 보완합니다.`);
  }
  if (overlappingInformation.length) {
    complementaryReasons.push(`현재 사이트와 ${overlappingInformation.map((type) => SITE_INFORMATION_LABELS[type]).join(", ")} 정보는 겹치지만 제공 기관과 범위가 다릅니다.`);
  }
  if (!complementaryReasons.length) {
    complementaryReasons.push("현재 추적 사이트와 다른 기관의 정보를 함께 확인할 수 있습니다.");
  }

  return {
    siteId: site.id,
    name: site.name,
    url: site.url,
    score,
    recommendationReason: missingMatches.length
      ? `${site.name}은(는) ${missingMatches.map((type) => SITE_INFORMATION_LABELS[type]).join(", ")} 정보를 제공해 현재 정보 공백을 보완합니다.`
      : `${site.name}은(는) 관심 정보와 연결되는 공식 정보를 추가로 확인할 수 있어 추천합니다.`,
    profileReasons,
    complementaryReasons,
    informationTypes: site.informationTypes,
    overlappingInformation,
    missingCoverageFilled: missingMatches,
    strengths: site.strengths,
    limitations: site.limitations,
    trusted: site.trusted,
    providerType: site.providerType,
  };
}

export function recommendSites({
  profile = null,
  trackedSites = [],
  desiredInformation = [],
  candidateSites = [],
  keyword = null,
}) {
  const normalizedDesiredInformation = normalizeTypes(desiredInformation);
  const resolvedDesiredInformation = normalizedDesiredInformation.length
    ? normalizedDesiredInformation
    : inferDesiredInformation(profile, keyword);
  const validTrackedSites = trackedSites.filter((site) => site?.active);
  const trackedSiteIds = new Set(validTrackedSites.map((site) => site.id));
  const currentlyCovered = normalizeTypes(validTrackedSites.flatMap((site) => site.informationTypes));
  const missingCoverage = resolvedDesiredInformation.filter((type) => !currentlyCovered.includes(type));
  const interestTypes = inferDesiredInformation(profile, keyword);
  const recommendations = candidateSites
    .filter((site) => site?.active && !trackedSiteIds.has(site.id))
    .map((site) => createRecommendation(site, {
      currentlyCovered,
      desiredInformation: resolvedDesiredInformation,
      interestTypes,
      missingCoverage,
      profile,
    }))
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ko"))
    .slice(0, MAX_RECOMMENDATIONS);

  return {
    recommendations,
    coverage: createCoverage(validTrackedSites, resolvedDesiredInformation, recommendations),
  };
}

export { SCORE_WEIGHTS };
