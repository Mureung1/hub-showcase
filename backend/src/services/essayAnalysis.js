const CATEGORY_FIELDS = [
  { label: "전공", getText: (profile) => [profile.major, profile.doubleMajor, profile.minor].filter(Boolean).join(" ") },
  { label: "자격증", getText: (profile) => (profile.certificates ?? []).join(", ") },
  { label: "경험", getText: (profile) => profile.experience ?? "" },
];

function normalize(text) {
  return text.replace(/\s+/g, "");
}

const QUESTION_TYPES = [
  {
    label: "지원 동기",
    keywords: ["동기", "이유", "포부"],
    priority: ["전공", "자격증", "경험"],
    verb: "계기",
    intro: "이 문항은 지원 동기를 묻고 있어요.",
    fallback:
      "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 지원 동기를 일반적인 관심 계기와 목표 중심으로 작성해보세요.",
  },
  {
    label: "경험 사례",
    keywords: ["경험", "사례", "프로젝트", "현장실습", "협업", "해결"],
    priority: ["경험", "자격증", "전공"],
    verb: "사례",
    intro: "이 문항은 경험 사례를 묻고 있어요.",
    fallback:
      "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 경험 사례를 일반적인 상황과 태도 중심으로 작성해보세요.",
  },
  {
    label: "강점",
    keywords: ["강점", "역량"],
    priority: ["자격증", "전공", "경험"],
    verb: "근거",
    intro: "이 문항은 강점을 묻고 있어요.",
    fallback:
      "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 강점을 일반적인 자기 이해와 강점 중심으로 작성해보세요.",
  },
  {
    label: "기획 아이디어",
    keywords: ["아이디어", "기획", "차별점"],
    priority: ["경험", "전공", "자격증"],
    verb: "아이디어",
    intro: "이 문항은 기획 아이디어를 묻고 있어요.",
    fallback:
      "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 기획 아이디어를 일반적인 아이디어 발상 과정 중심으로 작성해보세요.",
  },
];

const GENERAL_TYPE = {
  label: "답변",
  priority: ["전공", "경험", "자격증"],
  verb: "사례",
  intro: "이 문항은 자유 서술형이에요.",
  fallback:
    "회원님의 프로필에서 이 문항과 직접 연결할 전공·자격증·경험 정보를 찾지 못했어요. 답변을 일반적인 내용 중심으로 작성해보세요.",
};

function classifyQuestionType(question) {
  const normalized = normalize(question);
  return QUESTION_TYPES.find(({ keywords }) => keywords.some((keyword) => normalized.includes(keyword))) ?? GENERAL_TYPE;
}

function pickCategories(priority, profile) {
  const categoryByLabel = new Map(CATEGORY_FIELDS.map((field) => [field.label, field]));
  return priority
    .map((label) => categoryByLabel.get(label))
    .filter((field) => field.getText(profile))
    .slice(0, 2)
    .map((field) => `${field.label}(${field.getText(profile)})`);
}

export function analyzeEssayQuestion(question, profile) {
  const questionType = classifyQuestionType(question);
  const categories = pickCategories(questionType.priority, profile);

  if (categories.length === 0) {
    return questionType.fallback;
  }

  return `${questionType.intro} 회원님의 ${categories.join(" · ")} 내용을 구체적인 ${questionType.verb}와 함께 풀어보면 좋아요.`;
}
