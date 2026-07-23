const SCORE_WEIGHTS = Object.freeze({
  base: 48,
  disqualifying: -32,
  interest: 6,
  missingCondition: -12,
  missingUserInfo: -8,
  preferred: 6,
  required: 11,
});

const SCHOOL_REGIONS = Object.freeze({
  경북대학교: ["대구"],
  계명대학교: ["대구"],
  대구대학교: ["경북"],
  부산대학교: ["부산"],
  서울대학교: ["서울"],
  연세대학교: ["서울"],
  영남대학교: ["경북"],
  울산대학교: ["울산"],
  전남대학교: ["광주"],
  전북대학교: ["전북"],
  제주대학교: ["제주"],
  충남대학교: ["대전"],
  충북대학교: ["충북"],
  한양대학교: ["서울"],
});

const REGION_ALIASES = Object.freeze({
  서울: ["서울"],
  경기: ["경기", "수도권"],
  인천: ["인천", "수도권"],
  대구: ["대구"],
  경북: ["경북", "경상북도", "대구·경북", "대구경북"],
  부산: ["부산"],
  울산: ["울산"],
  경남: ["경남", "경상남도"],
  광주: ["광주"],
  전북: ["전북", "전라북도"],
  전남: ["전남", "전라남도"],
  대전: ["대전"],
  세종: ["세종"],
  충북: ["충북", "충청북도"],
  충남: ["충남", "충청남도"],
  강원: ["강원", "강원도"],
  제주: ["제주"],
  온라인: ["온라인", "비대면", "원격"],
});

const MAJOR_FAMILIES = Object.freeze({
  computer: ["컴퓨터", "소프트웨어", "인공지능", "ai", "데이터사이언스", "데이터과학"],
  mathematics: ["수학", "응용수학", "통계"],
  design: ["디자인", "시각디자인", "산업디자인"],
  business: ["경영", "경제", "회계"],
  engineering: ["공학", "전자", "전기", "기계", "화학공학"],
});

const CATEGORY_TEXT = Object.freeze({
  activity: "대외활동",
  contest: "공모전",
  scholarship: "장학금",
  support: "지원사업",
  unknown: "",
  volunteer: "봉사",
});

const LANGUAGE_ALIASES = Object.freeze({
  ielts: ["ielts", "아이엘츠"],
  opic: ["opic", "오픽"],
  teps: ["teps", "텝스"],
  toeic: ["toeic", "토익"],
  toefl: ["toefl", "토플"],
});

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, "");
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

const STUDENT_APPLICANT_PATTERN = /대학생|재학생|학생|청년|개인|팀|졸업생|취업\s*준비생|예비\s*창업자/i;
const BUSINESS_APPLICANT_PATTERN = /기업|중소기업|소상공인|사업자|법인|스타트업/i;
const APPLICANT_LABEL_PATTERN = /지원\s*대상|신청\s*대상|참가\s*대상|모집\s*대상|지원\s*자격|신청\s*자격|참여\s*기업/i;

function findBusinessOnlyAudience(opportunity, sourceText = "") {
  const requiredAudienceText = [
    opportunity.target,
    ...(opportunity.eligibility || [])
      .filter((item) => item?.required === true)
      .flatMap((item) => [item.condition, item.evidence]),
  ].filter(Boolean).join("\n");
  const title = String(opportunity.title || "");

  if (
    BUSINESS_APPLICANT_PATTERN.test(requiredAudienceText) &&
    !STUDENT_APPLICANT_PATTERN.test(requiredAudienceText)
  ) {
    return requiredAudienceText;
  }

  const applicantLines = String(sourceText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => APPLICANT_LABEL_PATTERN.test(line));
  const businessOnlyLine = applicantLines.find((line) => (
    BUSINESS_APPLICANT_PATTERN.test(line) &&
    !STUDENT_APPLICANT_PATTERN.test(line)
  ));

  if (businessOnlyLine) {
    return businessOnlyLine;
  }

  if (
    /참여\s*기업[^.\n]{0,40}(?:모집|공고)|기업[^.\n]{0,30}(?:모집|선정)\s*공고/i.test(title) &&
    !STUDENT_APPLICANT_PATTERN.test(title)
  ) {
    return title;
  }

  return null;
}

function includesTerm(text, term) {
  const normalizedText = normalizeText(text);
  const normalizedTerm = normalizeText(term);

  if (!normalizedTerm) return false;
  if (/^[a-z]{1,2}$/i.test(normalizedTerm)) {
    return new RegExp(`(^|[^a-z])${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i")
      .test(normalizedText);
  }

  return compactText(normalizedText).includes(compactText(normalizedTerm));
}

function findRegions(text) {
  return Object.entries(REGION_ALIASES).flatMap(([region, aliases]) => (
    aliases.some((alias) => includesTerm(text, alias)) ? [region] : []
  ));
}

function findMajorFamilies(text) {
  return Object.entries(MAJOR_FAMILIES).flatMap(([family, terms]) => (
    terms.some((term) => includesTerm(text, term)) ? [family] : []
  ));
}

function findLanguageFamily(text) {
  return Object.entries(LANGUAGE_ALIASES).find(([, aliases]) => (
    aliases.some((alias) => includesTerm(text, alias))
  ))?.[0] || null;
}

function inferEligibilityType(text) {
  if (/학점|평점|gpa/i.test(text)) return "gpa";
  if (/소득\s*분위|분위\s*(?:이하|이상|미만|초과)/.test(text)) return "income";
  if (/toeic|토익|toefl|토플|opic|오픽|teps|텝스|ielts/i.test(text)) return "other";
  if (/학년|신입생|졸업예정/.test(text)) return "grade";
  if (/팀|개인\s*참가/.test(text)) return "team";
  if (/주\s*\d+\s*시간|활동\s*시간/.test(text)) return "period";
  if (findRegions(text).length || /지역|오프라인|현장/.test(text)) return "region";
  if (findMajorFamilies(text).length || /전공/.test(text)) return "major";
  if (/대학|학교|재학생/.test(text)) return "school";
  return "other";
}

function result(outcome, { reason = "", missing = "", missingKind = null, action = "" } = {}) {
  return { action, missing, missingKind, outcome, reason };
}

function evaluateGrade(profile, text) {
  if (/졸업예정자?\s*제외/.test(text)) {
    return result("missing", {
      missing: "졸업예정 여부",
      missingKind: "user",
      action: "졸업예정자 제외 조건에 해당하는지 확인",
    });
  }

  if (profile.grade === null || profile.grade === undefined) {
    return result("missing", {
      missing: "사용자 학년 정보",
      missingKind: "user",
      action: "프로필에 학년 정보 입력",
    });
  }

  const range = text.match(/(\d)\s*학년?\s*(?:~|-|부터)\s*(\d)\s*학년/);
  const minimum = text.match(/(\d)\s*학년\s*이상/);
  const maximum = text.match(/(\d)\s*학년\s*(?:이하|까지)/);
  let matches = null;

  if (range) matches = profile.grade >= Number(range[1]) && profile.grade <= Number(range[2]);
  else if (minimum) matches = profile.grade >= Number(minimum[1]);
  else if (maximum) matches = profile.grade <= Number(maximum[1]);
  else if (/신입생만|1\s*학년만/.test(text)) matches = profile.grade === 1;

  if (matches === null) {
    return result("missing", {
      missing: "공고의 학년 조건 해석",
      missingKind: "condition",
      action: "원문에서 학년 조건 확인",
    });
  }

  return matches
    ? result("matched", { reason: `${profile.grade}학년으로 학년 조건을 충족합니다.` })
    : result("disqualified", { reason: `${profile.grade}학년은 '${text}' 조건을 충족하지 않습니다.` });
}

function extractNamedSchools(text) {
  return unique((String(text).match(/[가-힣]{2,}(?:대학교|대학)/g) || []).filter((name) => (
    !/전국|소재|4년제|전문|재학/.test(name)
  )));
}

function evaluateSchool(profile, text) {
  if (!profile.school) {
    return result("missing", {
      missing: "사용자 학교 정보",
      missingKind: "user",
      action: "프로필에 학교 정보 입력",
    });
  }

  const namedSchools = extractNamedSchools(text);

  if (namedSchools.length) {
    const matches = namedSchools.some((school) => compactText(profile.school).includes(compactText(school)) ||
      compactText(school).includes(compactText(profile.school)));
    return matches
      ? result("matched", { reason: `${profile.school} 소속 조건을 충족합니다.` })
      : result("disqualified", { reason: `허용 학교(${namedSchools.join(", ")}) 조건과 소속 학교가 다릅니다.` });
  }

  const requiredRegions = findRegions(text).filter((region) => region !== "온라인");

  if (/소재|지역\s*대학/.test(text) && requiredRegions.length) {
    const schoolRegions = SCHOOL_REGIONS[profile.school] || [];

    if (!schoolRegions.length) {
      return result("missing", {
        missing: "학교 소재 지역 정보",
        missingKind: "user",
        action: "학교 소재지가 공고의 지역 조건에 포함되는지 확인",
      });
    }

    const matches = schoolRegions.some((region) => requiredRegions.includes(region));
    return matches
      ? result("matched", { reason: `${profile.school} 소재 지역이 학교 지역 조건과 맞습니다.` })
      : result("disqualified", { reason: `${profile.school} 소재 지역이 ${requiredRegions.join("·")} 소재 대학 조건과 다릅니다.` });
  }

  if (/4\s*년제/.test(text)) {
    return result("missing", {
      missing: "4년제 대학 재학 여부",
      missingKind: "user",
      action: "소속 학교의 학제 조건 확인",
    });
  }

  if (/전국|대학생|대학교\s*재학|재학생/.test(text) || includesTerm(text, profile.school)) {
    return result("matched", { reason: `${profile.school} 재학생으로 학교 조건을 충족합니다.` });
  }

  return result("missing", {
    missing: "공고의 학교 조건 해석",
    missingKind: "condition",
    action: "원문에서 학교 및 재학 조건 확인",
  });
}

function evaluateMajor(profile, text) {
  if (/전공\s*무관/.test(text)) {
    return result("matched", { reason: "전공 제한이 없는 공고입니다." });
  }

  if (!profile.majors?.length) {
    return result("missing", {
      missing: "사용자 전공 정보",
      missingKind: "user",
      action: "프로필에 전공 정보 입력",
    });
  }

  const conditionFamilies = findMajorFamilies(text);
  const profileFamilies = unique(profile.majors.flatMap(findMajorFamilies));
  const familyMatch = conditionFamilies.some((family) => profileFamilies.includes(family));
  const exactMatch = profile.majors.some((major) => includesTerm(text, major));

  if (!conditionFamilies.length && !profile.majors.some((major) => includesTerm(text, major))) {
    return result("missing", {
      missing: "공고의 전공 범위 해석",
      missingKind: "condition",
      action: "원문에서 인정 전공 범위 확인",
    });
  }

  return familyMatch || exactMatch
    ? result("matched", { reason: `전공(${profile.majors.join(", ")})이 관련 전공 조건과 맞습니다.` })
    : result("disqualified", { reason: `전공(${profile.majors.join(", ")})이 '${text}' 조건과 맞지 않습니다.` });
}

function evaluateRegion(profile, text) {
  if (/전국/.test(text) && !/소재\s*대학/.test(text)) {
    return result("matched", { reason: "전국 단위 활동으로 지역 제한이 없습니다." });
  }

  const requiredRegions = findRegions(text);
  const offlineRegions = requiredRegions.filter((region) => region !== "온라인");
  const profileRegions = unique((profile.regions || []).flatMap((region) => findRegions(region)));
  const hasOnline = requiredRegions.includes("온라인");
  const onlineMatch = profileRegions.includes("온라인");
  const offlineMatch = offlineRegions.some((region) => profileRegions.includes(region));

  if (!profile.regions?.length) {
    return result("missing", {
      missing: "사용자 활동 가능 지역",
      missingKind: "user",
      action: "프로필에 활동 가능 지역 입력",
    });
  }

  if (hasOnline && offlineRegions.length && !offlineMatch) {
    return result("missing", {
      missing: `${offlineRegions.join("·")} 오프라인 일정 참여 가능 여부`,
      missingKind: "user",
      action: "오프라인 본선·현장 일정과 이동 가능 여부 확인",
    });
  }

  if ((hasOnline && onlineMatch) || offlineMatch) {
    return result("matched", { reason: "활동 지역이 프로필의 가능 지역과 맞습니다." });
  }

  if (hasOnline && !offlineRegions.length) {
    return result("missing", {
      missing: "온라인 활동 참여 가능 여부",
      missingKind: "user",
      action: "온라인 활동 참여 가능 여부 확인",
    });
  }

  if (offlineRegions.length && /필수|상주|매주|오프라인\s*진행|현장\s*진행/.test(text)) {
    return result("disqualified", {
      reason: `필수 활동 지역(${offlineRegions.join("·")})이 프로필의 가능 지역과 다릅니다.`,
    });
  }

  return result("missing", {
    missing: "필수 활동 지역 참여 가능 여부",
    missingKind: "user",
    action: "활동 장소와 필수 참석 일정을 확인",
  });
}

function evaluateTeam(profile, text) {
  const teamRequired = /팀\s*(?:참가|구성|지원)?\s*필수|팀으로만|팀\s*지원만/.test(text);
  const individualAllowed = /개인\s*(?:참가|지원)\s*(?:가능|허용)|개인\s*또는\s*팀/.test(text);

  if (individualAllowed) {
    return result("matched", { reason: "개인 또는 팀 참가를 선택할 수 있습니다." });
  }

  if (!teamRequired) {
    return result("missing", {
      missing: "팀 참가 필수 여부",
      missingKind: "condition",
      action: "원문에서 개인·팀 참가 방식을 확인",
    });
  }

  if (profile.canJoinTeam === null || profile.canJoinTeam === undefined) {
    return result("missing", {
      missing: "사용자 팀 참여 가능 여부",
      missingKind: "user",
      action: "프로필에 팀 참여 가능 여부 입력",
    });
  }

  return profile.canJoinTeam
    ? result("matched", { reason: "팀 참가 필수 조건을 충족합니다.", action: "팀원 구성 및 역할 결정" })
    : result("disqualified", { reason: "팀 참가가 필수지만 프로필에서 팀 참여 불가로 설정했습니다." });
}

function evaluateGpa(profile, text) {
  const threshold = text.match(/(?:학점|평점|gpa)[^\d]{0,12}(\d(?:\.\d+)?)\s*(?:점)?\s*(이상|이하)/i);

  if (!threshold) {
    return result("missing", {
      missing: "공고의 학점 기준 해석",
      missingKind: "condition",
      action: "원문에서 학점 기준 확인",
    });
  }

  if (profile.gpa === null || profile.gpa === undefined) {
    return result("missing", {
      missing: "사용자 학점 정보",
      missingKind: "user",
      action: "프로필에 학점 정보 입력",
    });
  }

  const value = Number(threshold[1]);
  const matches = threshold[2] === "이상" ? profile.gpa >= value : profile.gpa <= value;
  return matches
    ? result("matched", { reason: `학점 ${profile.gpa}로 필수 학점 기준을 충족합니다.` })
    : result("disqualified", { reason: `학점 ${profile.gpa}가 '${threshold[0]}' 기준에 미달합니다.` });
}

function evaluateIncome(profile, text) {
  const threshold = text.match(/(\d{1,2})\s*분위\s*(이하|미만|이상|초과)/);

  if (!threshold) {
    return result("missing", {
      missing: "공고의 소득분위 기준 해석",
      missingKind: "condition",
      action: "원문에서 소득분위 기준 확인",
    });
  }

  if (profile.incomeBracket === null || profile.incomeBracket === undefined) {
    return result("missing", {
      missing: "사용자 소득분위 정보",
      missingKind: "user",
      action: "프로필에 소득분위 정보 입력",
    });
  }

  const thresholdValue = Number(threshold[1]);
  const operator = threshold[2];
  const matches = operator === "이하"
    ? profile.incomeBracket <= thresholdValue
    : operator === "미만"
      ? profile.incomeBracket < thresholdValue
      : operator === "이상"
        ? profile.incomeBracket >= thresholdValue
        : profile.incomeBracket > thresholdValue;

  return matches
    ? result("matched", { reason: `소득 ${profile.incomeBracket}분위로 필수 기준을 충족합니다.` })
    : result("disqualified", { reason: `소득 ${profile.incomeBracket}분위가 '${threshold[0]}' 기준과 맞지 않습니다.` });
}

function evaluateLanguage(profile, text) {
  const requirement = text.match(/(toeic|토익|toefl|토플|opic|오픽|teps|텝스|ielts)[^\d]{0,12}(\d+(?:\.\d+)?)/i);

  if (!requirement) {
    return result("missing", {
      missing: "공고의 어학성적 기준 해석",
      missingKind: "condition",
      action: "원문에서 인정 어학시험과 기준 점수 확인",
    });
  }

  const requiredType = normalizeText(requirement[1]);
  const requiredFamily = findLanguageFamily(requiredType);
  const userScore = (profile.languageScores || []).find((score) => {
    const scoreFamily = findLanguageFamily(score.type);
    return (requiredFamily && scoreFamily === requiredFamily) ||
      includesTerm(score.type, requiredType) ||
      includesTerm(requiredType, score.type);
  });

  if (!userScore) {
    return result("missing", {
      missing: `${requirement[1]} 어학성적 정보`,
      missingKind: "user",
      action: `프로필에 ${requirement[1]} 어학성적 입력`,
    });
  }

  const scoreNumber = Number(String(userScore.score).match(/\d+(?:\.\d+)?/)?.[0]);
  if (!Number.isFinite(scoreNumber)) {
    return result("missing", {
      missing: `${requirement[1]} 점수 형식 확인`,
      missingKind: "user",
      action: `${requirement[1]} 점수를 숫자로 확인`,
    });
  }

  return scoreNumber >= Number(requirement[2])
    ? result("matched", { reason: `${requirement[1]} ${userScore.score}로 어학 기준을 충족합니다.` })
    : result("disqualified", { reason: `${requirement[1]} ${userScore.score}가 필수 점수에 미달합니다.` });
}

function evaluatePeriod(profile, text) {
  const hours = text.match(/주\s*(\d+(?:\.\d+)?)\s*시간\s*이상/);

  if (!hours) {
    return result("missing", {
      missing: "공고의 활동 시간 조건 해석",
      missingKind: "condition",
      action: "주당 활동 시간과 필수 일정을 확인",
    });
  }

  if (profile.availableHoursPerWeek === null || profile.availableHoursPerWeek === undefined) {
    return result("missing", {
      missing: "사용자 주당 활동 가능 시간",
      missingKind: "user",
      action: "프로필에 주당 활동 가능 시간 입력",
    });
  }

  return profile.availableHoursPerWeek >= Number(hours[1])
    ? result("matched", { reason: `주 ${profile.availableHoursPerWeek}시간 활동 가능해 시간 조건을 충족합니다.` })
    : result("disqualified", { reason: `주당 활동 가능 시간이 '${hours[0]}' 조건보다 적습니다.` });
}

function evaluateCondition(profile, condition) {
  const text = normalizeText(`${condition.condition} ${condition.evidence}`);
  const type = condition.type === "other" ? inferEligibilityType(text) : condition.type;

  if (type === "grade") return evaluateGrade(profile, text);
  if (type === "school") return evaluateSchool(profile, text);
  if (type === "major") return evaluateMajor(profile, text);
  if (type === "region") return evaluateRegion(profile, text);
  if (type === "team") return evaluateTeam(profile, text);
  if (type === "gpa") return evaluateGpa(profile, text);
  if (type === "income") return evaluateIncome(profile, text);
  if (type === "period") return evaluatePeriod(profile, text);
  if (/toeic|토익|toefl|토플|opic|오픽|teps|텝스|ielts/i.test(text)) {
    return evaluateLanguage(profile, text);
  }

  return result("missing", {
    missing: `조건 확인 필요: ${condition.condition || condition.evidence}`,
    missingKind: "condition",
    action: "원문에서 세부 지원 자격 확인",
  });
}

function createTargetCondition(opportunity) {
  if (!opportunity.target) return null;
  return {
    type: inferEligibilityType(opportunity.target),
    condition: opportunity.target,
    evidence: opportunity.target,
    required: true,
  };
}

function createNextActions({ actions, disqualifyingReasons, opportunity }) {
  const nextActions = [...actions];

  opportunity.requiredDocuments.forEach((document) => {
    if (/재학증명서|성적증명서|소득|어학|신청서|계획서|자기소개서/.test(document)) {
      nextActions.push(`${document} 준비`);
    }
  });

  if (!opportunity.deadline || opportunity.uncertainFields.includes("마감일")) {
    nextActions.push("원문 공고에서 마감일 재확인");
  }

  if (disqualifyingReasons.length) {
    nextActions.push("원문에서 예외 자격 또는 대체 지원 조건 확인");
  }

  return unique(nextActions).slice(0, 8);
}

function calculateScore({ disqualifyingCount, interestCount, missingConditionCount, missingUserCount, preferredCount, requiredMatchCount, status }) {
  if (!requiredMatchCount && !preferredCount && !interestCount && status === "insufficient_info") {
    return null;
  }

  const rawScore = SCORE_WEIGHTS.base +
    requiredMatchCount * SCORE_WEIGHTS.required +
    preferredCount * SCORE_WEIGHTS.preferred +
    Math.min(interestCount, 2) * SCORE_WEIGHTS.interest +
    missingConditionCount * SCORE_WEIGHTS.missingCondition +
    missingUserCount * SCORE_WEIGHTS.missingUserInfo +
    disqualifyingCount * SCORE_WEIGHTS.disqualifying;
  let score = Math.max(0, Math.min(100, Math.round(rawScore)));

  if (status === "not_eligible") score = Math.min(score, 35);
  if (status === "insufficient_info") score = Math.min(score, 60);
  return score;
}

function createSummary(status, counts) {
  if (status === "not_eligible") {
    return `필수 조건 ${counts.disqualifying}개가 프로필과 명확히 맞지 않습니다.`;
  }
  if (status === "insufficient_info") {
    return "지원 가능성을 확정하기에는 공고 또는 프로필 정보가 부족합니다.";
  }
  if (status === "conditionally_eligible") {
    return `명확한 불충족은 없지만 필수 정보 ${counts.missing}개를 추가로 확인해야 합니다.`;
  }
  return "현재 프로필로 확인 가능한 필수 조건을 충족합니다.";
}

export function matchOpportunity({ profile, opportunity, sourceText = "" }) {
  if (!profile) {
    return {
      status: "insufficient_info",
      score: null,
      summary: "사용자 프로필이 없어 공고 핵심 정보만 구조화했습니다. 지원 가능성은 판정하지 않았습니다.",
      matchedReasons: [],
      missingInfo: ["사용자 프로필"],
      disqualifyingReasons: [],
      nextActions: ["맞춤 판정이 필요하면 사용자 프로필을 저장해 주세요."],
    };
  }

  const safeProfile = profile;
  const safeOpportunity = {
    title: null,
    category: "unknown",
    target: null,
    eligibility: [],
    preferred: [],
    requiredDocuments: [],
    deadline: null,
    uncertainFields: [],
    ...opportunity,
  };
  const businessOnlyAudience = findBusinessOnlyAudience(safeOpportunity, sourceText);

  if (businessOnlyAudience) {
    return {
      status: "not_eligible",
      score: 0,
      summary: "기업 또는 사업자만 신청할 수 있는 공고로, 대학생 개인 지원 대상이 아닙니다.",
      matchedReasons: [],
      missingInfo: [],
      disqualifyingReasons: [
        `신청 대상이 기업으로 제한되어 있습니다: ${businessOnlyAudience}`,
      ],
      nextActions: ["대학생 개인이 신청할 수 있는 별도 공고인지 원문에서 확인"],
    };
  }

  const explicitRequired = safeOpportunity.eligibility.filter((condition) => condition.required === true);
  const targetCondition = explicitRequired.length ? null : createTargetCondition(safeOpportunity);
  const requiredConditions = targetCondition ? [targetCondition] : explicitRequired;
  const preferredConditions = [
    ...safeOpportunity.eligibility.filter((condition) => condition.required !== true),
    ...safeOpportunity.preferred.map((condition) => ({
      ...condition,
      type: inferEligibilityType(`${condition.condition} ${condition.evidence}`),
      required: false,
    })),
  ];
  const matchedReasons = [];
  const missingInfo = [];
  const disqualifyingReasons = [];
  const actions = [];
  let requiredMatchCount = 0;
  let missingConditionCount = 0;
  let missingUserCount = 0;

  requiredConditions.forEach((condition) => {
    const evaluation = evaluateCondition(safeProfile, condition);

    if (evaluation.outcome === "matched") {
      requiredMatchCount += 1;
      matchedReasons.push(evaluation.reason);
    } else if (evaluation.outcome === "disqualified") {
      disqualifyingReasons.push(evaluation.reason);
    } else {
      missingInfo.push(evaluation.missing);
      if (evaluation.missingKind === "condition") missingConditionCount += 1;
      else missingUserCount += 1;
    }

    if (evaluation.action) actions.push(evaluation.action);
  });

  let preferredMatchCount = 0;
  preferredConditions.forEach((condition) => {
    const evaluation = evaluateCondition(safeProfile, condition);
    if (evaluation.outcome === "matched") {
      preferredMatchCount += 1;
      matchedReasons.push(`우대 조건 충족: ${condition.condition}`);
    }
  });

  const opportunityText = [
    safeOpportunity.title,
    safeOpportunity.target,
    CATEGORY_TEXT[safeOpportunity.category],
    ...safeOpportunity.benefits,
  ].join(" ");
  const matchedInterests = unique((safeProfile.interests || []).filter((interest) => (
    includesTerm(opportunityText, interest)
  )));

  if (matchedInterests.length) {
    matchedReasons.push(`관심 분야(${matchedInterests.join(", ")})와 관련된 공고입니다.`);
  }

  if (!requiredConditions.length) {
    missingInfo.push("공고의 필수 지원 조건");
    missingConditionCount += 1;
    actions.push("원문에서 지원 대상과 필수 조건 확인");
  }

  if (safeOpportunity.uncertainFields.some((field) => /지원 대상|지원 조건/.test(field))) {
    missingInfo.push("공고의 지원 대상 세부 정보");
    missingConditionCount += 1;
    actions.push("원문에서 지원 대상 세부 조건 확인");
  }

  const uniqueMatchedReasons = unique(matchedReasons);
  const uniqueMissingInfo = unique(missingInfo);
  const uniqueDisqualifyingReasons = unique(disqualifyingReasons);
  let status = "eligible";

  if (uniqueDisqualifyingReasons.length) {
    status = "not_eligible";
  } else if (
    !requiredConditions.length ||
    (missingConditionCount >= Math.ceil(requiredConditions.length / 2) && requiredMatchCount === 0)
  ) {
    status = "insufficient_info";
  } else if (uniqueMissingInfo.length) {
    status = "conditionally_eligible";
  }

  const score = calculateScore({
    disqualifyingCount: uniqueDisqualifyingReasons.length,
    interestCount: matchedInterests.length,
    missingConditionCount,
    missingUserCount,
    preferredCount: preferredMatchCount,
    requiredMatchCount,
    status,
  });
  const nextActions = createNextActions({
    actions,
    disqualifyingReasons: uniqueDisqualifyingReasons,
    opportunity: safeOpportunity,
  });

  return {
    status,
    score,
    summary: createSummary(status, {
      disqualifying: uniqueDisqualifyingReasons.length,
      missing: uniqueMissingInfo.length,
    }),
    matchedReasons: uniqueMatchedReasons,
    missingInfo: uniqueMissingInfo,
    disqualifyingReasons: uniqueDisqualifyingReasons,
    nextActions,
  };
}

export { SCORE_WEIGHTS };
