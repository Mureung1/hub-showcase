export type CategorySemanticGroup =
  | "cafe"
  | "food"
  | "bakery"
  | "convenience"
  | "flower"
  | "beauty"
  | "apparel"
  | "sports"
  | "academy"
  | "lodging"
  | "generic";

const CATEGORY_RULES: ReadonlyArray<{
  group: CategorySemanticGroup;
  terms: readonly string[];
}> = [
  { group: "cafe", terms: ["카페", "커피"] },
  { group: "bakery", terms: ["베이커리", "제과", "빵", "도넛"] },
  { group: "convenience", terms: ["편의점", "슈퍼", "마트"] },
  { group: "flower", terms: ["꽃", "화원"] },
  { group: "beauty", terms: ["미용", "헤어", "네일", "피부관리", "이발"] },
  { group: "apparel", terms: ["의류", "의복", "패션", "옷", "신발"] },
  {
    group: "sports",
    terms: ["체육", "헬스", "피트니스", "스포츠", "요가", "필라테스"],
  },
  { group: "academy", terms: ["학원", "교습", "교육원", "훈련"] },
  {
    group: "lodging",
    terms: ["숙박", "호텔", "모텔", "여관", "게스트하우스", "펜션"],
  },
  { group: "food", terms: ["음식점", "한식", "중식", "일식", "분식", "주점"] },
];

const CATEGORY_TONES: Record<CategorySemanticGroup, string> = {
  cafe: "green",
  food: "orange",
  bakery: "blue",
  convenience: "navy",
  flower: "yellow",
  beauty: "pink",
  apparel: "violet",
  sports: "teal",
  academy: "cyan",
  lodging: "plum",
  generic: "gray",
};

const CATEGORY_LABELS: Record<CategorySemanticGroup, string> = {
  cafe: "카페",
  food: "음식점",
  bakery: "베이커리",
  convenience: "편의점",
  flower: "꽃집",
  beauty: "미용",
  apparel: "의류",
  sports: "체육",
  academy: "학원",
  lodging: "숙박",
  generic: "기타",
};

const FOCUS_CATEGORY_CODES: Record<CategorySemanticGroup, string> = {
  cafe: "I21201",
  food: "I20101",
  bakery: "I21001",
  convenience: "G20405",
  flower: "G21901",
  beauty: "S20701",
  apparel: "G20901",
  sports: "S20801",
  academy: "P10501",
  lodging: "I10103",
  generic: "LOCAL_SERVICE",
};

export function resolveCategorySemanticGroup(category: string): CategorySemanticGroup {
  const normalized = category.trim().toLocaleLowerCase("ko-KR");
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => normalized.includes(term.toLocaleLowerCase("ko-KR")))) {
      return rule.group;
    }
  }
  return "generic";
}

export function categoryTone(category: string) {
  return CATEGORY_TONES[resolveCategorySemanticGroup(category)];
}

export function categoryGroupLabel(category: string) {
  return CATEGORY_LABELS[resolveCategorySemanticGroup(category)];
}

export function categoryFocusCode(category: string, sourceCode?: string | null) {
  const group = resolveCategorySemanticGroup(category);
  return group === "generic"
    ? sourceCode?.trim() || FOCUS_CATEGORY_CODES.generic
    : FOCUS_CATEGORY_CODES[group];
}
