/**
 * 05_CODE_SCANNER_SCORER.md 8장 "project_overview 추출 규칙".
 *
 * README에서 마크다운 ATX 헤딩(#~######)만 섹션 경계로 인식하고, 매칭된
 * 헤딩부터 다음 헤딩 전까지 전체 텍스트를 그 항목의 값으로 쓴다.
 * 항목 단위로 실패를 허용한다 — 5개 중 일부만 찾아도 나머지는 빈 값으로 둔다
 * (Evidence First 원칙: 근거 없는 내용을 지어내지 않는다).
 *
 * 키워드는 대소문자 무시, 부분 포함(substring) 매칭이다(scorer.js의
 * namePatternBonus와 동일한 트레이드오프 — 오탐보다 미탐이 더 나쁘다고 보고 채택).
 */

const HEADING_REGEX = /^#{1,6}\s+(.+?)\s*$/;
const LIST_ITEM_REGEX = /^\s*(?:[-*]|\d+\.)\s+(.+)$/;

// 순서 = 한 헤딩이 여러 항목에 동시 매칭될 때의 우선순위
const ITEM_KEYWORDS = [
  { key: 'service_description', keywords: ['프로젝트 소개', '개요', '소개', 'overview', 'introduction', 'description'] },
  { key: 'problem_to_solve', keywords: ['배경', '문제 정의', '문제', 'problem', 'background'] },
  { key: 'duration', keywords: ['개발 기간', '기간', 'duration', 'period'] },
  { key: 'team_and_role', keywords: ['팀원', '팀 구성', '역할', '팀', 'team', 'role'] },
  { key: 'key_features', keywords: ['주요 기능', '핵심 기능', '기능', 'key features', 'features'] },
];

function parseHeadings(lines) {
  const headings = [];
  lines.forEach((line, index) => {
    const match = line.match(HEADING_REGEX);
    if (match) headings.push({ index, text: match[1] });
  });
  return headings;
}

function matchItemForHeading(headingText, filled) {
  const lower = headingText.toLowerCase();
  const item = ITEM_KEYWORDS.find(
    ({ key, keywords }) => !filled.has(key) && keywords.some((kw) => lower.includes(kw.toLowerCase()))
  );
  return item ? item.key : null;
}

function extractSectionText(lines, headingIndex, headingIndexes) {
  const nextHeadingIndex = headingIndexes.find((i) => i > headingIndex);
  const end = nextHeadingIndex ?? lines.length;
  return lines.slice(headingIndex + 1, end).join('\n').trim();
}

function parseListItems(sectionText) {
  return sectionText
    .split('\n')
    .map((line) => line.match(LIST_ITEM_REGEX))
    .filter(Boolean)
    .map((match) => match[1].trim());
}

export function emptyProjectOverview() {
  return {
    service_description: '',
    problem_to_solve: '',
    duration: '',
    team_and_role: '',
    key_features: [],
  };
}

export function parseReadme(content) {
  const lines = content.split('\n');
  const headings = parseHeadings(lines);
  const headingIndexes = headings.map((h) => h.index);
  const result = emptyProjectOverview();
  const filled = new Set();

  for (const heading of headings) {
    const itemKey = matchItemForHeading(heading.text, filled);
    if (!itemKey) continue;

    const sectionText = extractSectionText(lines, heading.index, headingIndexes);
    result[itemKey] = itemKey === 'key_features' ? parseListItems(sectionText) : sectionText;
    filled.add(itemKey);
  }

  return result;
}
