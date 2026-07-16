const TOP_N = 3;

const CATEGORY_FIELDS = [
  { label: "전공", getText: (profile) => [profile.major, profile.doubleMajor, profile.minor].filter(Boolean).join(" ") },
  { label: "자격증", getText: (profile) => (profile.certificates ?? []).join(" ") },
  { label: "경험", getText: (profile) => profile.experience ?? "" },
];

function normalize(text) {
  return text.replace(/\s+/g, "");
}

function textMatchesAnyKeyword(text, keywords) {
  const normalizedText = normalize(text);
  return keywords.some((keyword) => normalizedText.includes(normalize(keyword)));
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
  return keywords.filter((keyword) => normalizedProfileText.includes(normalize(keyword))).length;
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
    .slice(0, TOP_N);
}
