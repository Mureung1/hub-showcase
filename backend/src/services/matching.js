// 화면에는 3개씩 보여주고 "다음 추천 보기"로 더 볼 수 있게 한다.
// 실제 재입력 없이 같은 프로필로 더 볼 수 있는 최대치가 MAX_RECOMMENDATIONS.
export const RECOMMENDATIONS_PAGE_SIZE = 3;
const MAX_RECOMMENDATIONS = 9;

const CATEGORY_FIELDS = [
  { label: "전공", getText: (profile) => [profile.major, profile.doubleMajor, profile.minor].filter(Boolean).join(" ") },
  { label: "자격증", getText: (profile) => (profile.certificates ?? []).join(" ") },
  { label: "경험", getText: (profile) => profile.experience ?? "" },
];

function normalize(text) {
  return text.replace(/\s+/g, "");
}

// 크롤링된 공고의 keywords는 "생산직/조립/가공"처럼 "/"로 묶인 복합 카테고리 라벨이라
// 사용자가 입력한 자유 텍스트와 통째로 일치할 일이 거의 없다. "/" 단위로 쪼갠 토큰
// 각각을 후보 키워드로 취급해야 "기계공학과" 같은 입력이 "기계/자동차/조선"의 "기계"와 매칭된다.
function expandKeyword(keyword) {
  return keyword
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
}

function textMatchesAnyKeyword(text, keywords) {
  const normalizedText = normalize(text);
  const expandedKeywords = keywords.flatMap(expandKeyword);
  return expandedKeywords.some((keyword) => normalizedText.includes(normalize(keyword)));
}

function matchedCategories(profile, keywords) {
  return CATEGORY_FIELDS.filter(({ getText }) => textMatchesAnyKeyword(getText(profile), keywords)).map(
    ({ label }) => label,
  );
}

function buildProfileText(profile) {
  return CATEGORY_FIELDS.map(({ getText }) => getText(profile))
    .filter(Boolean)
    .join(" ");
}

export function parseNumber(input) {
  const match = String(input).match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function countKeywordOverlap(profileText, keywords) {
  const normalizedProfileText = normalize(profileText);
  const expandedKeywords = keywords.flatMap(expandKeyword);
  return expandedKeywords.filter((keyword) => normalizedProfileText.includes(normalize(keyword))).length;
}

function buildReasonShort(categories, gpaMet) {
  if (categories.length > 0) {
    return `${categories.slice(0, 2).join(" · ")} 조건 부합도 높음`;
  }
  return gpaMet ? "평균평점 조건 충족" : "관심 분야 공고";
}

function scorePosting(profile, posting) {
  const keywords = posting.keywords ?? [];
  const overlapCount = countKeywordOverlap(buildProfileText(profile), keywords);
  const gpa = parseNumber(profile.gpa);
  const gpaMet = gpa >= (posting.gpaMin ?? 0);
  const categories = matchedCategories(profile, keywords);

  return {
    score: overlapCount * 2 + (gpaMet ? 1 : -3),
    reasonShort: buildReasonShort(categories, gpaMet),
  };
}

export function scoreAndRank(profile, postings) {
  return postings
    .map((posting) => {
      const { score, reasonShort } = scorePosting(profile, posting);
      return { ...posting, score, reasonShort };
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.deadline) - new Date(b.deadline);
    })
    .slice(0, MAX_RECOMMENDATIONS);
}
