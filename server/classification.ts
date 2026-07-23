export type Classification = {
  categoryMain: string;
  categorySub: string | null;
};

const domainRules: Array<{
  domains: string[];
  classification: Classification;
}> = [
  {
    domains: ["youtube.com", "youtu.be"],
    classification: { categoryMain: "영상", categorySub: "유튜브" },
  },
  {
    domains: ["smartstore.naver.com"],
    classification: { categoryMain: "쇼핑", categorySub: "스마트스토어" },
  },
  {
    domains: ["shopping.naver.com"],
    classification: { categoryMain: "쇼핑", categorySub: "네이버쇼핑" },
  },
  {
    domains: ["instagram.com"],
    classification: { categoryMain: "SNS", categorySub: "인스타그램" },
  },
  {
    domains: ["x.com", "twitter.com"],
    classification: { categoryMain: "SNS", categorySub: "X" },
  },
  {
    domains: ["blog.naver.com"],
    classification: { categoryMain: "콘텐츠", categorySub: "블로그" },
  },
];

const keywordRules: Array<{
  keywords: string[];
  classification: Classification;
}> = [
  {
    keywords: ["화장품", "메이크업", "스킨케어", "cosmetic", "makeup"],
    classification: { categoryMain: "뷰티", categorySub: "화장품" },
  },
  {
    keywords: ["운동", "헬스", "다이어트", "workout", "fitness", "diet"],
    classification: { categoryMain: "건강", categorySub: "운동" },
  },
  {
    keywords: ["옷", "코디", "패션", "fashion", "outfit"],
    classification: { categoryMain: "패션", categorySub: "코디" },
  },
  {
    keywords: ["개발", "프로그래밍", "코딩", "react", "javascript", "typescript"],
    classification: { categoryMain: "개발", categorySub: "프로그래밍" },
  },
  {
    keywords: ["여행", "항공", "호텔", "travel", "flight", "hotel"],
    classification: { categoryMain: "여행", categorySub: "여행정보" },
  },
];

function matchesDomain(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

export function classifyContent(content: string): Classification {
  try {
    const url = new URL(content.trim());
    if (url.protocol === "http:" || url.protocol === "https:") {
      const hostname = url.hostname.toLowerCase();
      const domainRule = domainRules.find((rule) =>
        rule.domains.some((domain) => matchesDomain(hostname, domain))
      );
      if (domainRule) return domainRule.classification;
    }
  } catch {
    // URL이 아니면 키워드 규칙으로 분류한다.
  }

  const normalizedContent = content.toLowerCase();
  const keywordRule = keywordRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedContent.includes(keyword))
  );

  return (
    keywordRule?.classification ?? {
      categoryMain: "미분류",
      categorySub: "기타",
    }
  );
}
