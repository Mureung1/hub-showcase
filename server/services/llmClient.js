/**
 * LLM 연동 지점 (10_PROMPT_SPEC.md 기준).
 *
 * 이 파일의 함수들은 실제로는 LLM을 호출하지 않는다. 대신 실제 입력 데이터(README 발췌,
 * JD 원문, 추출된 tech stack)만으로 조합한 결정론적 문장을 반환해, 존재하지 않는 경험을
 * 지어내지 않는다는 Evidence First 원칙을 LLM 연동 전에도 지킨다.
 *
 * Phase 2에서 실제 API(Claude/OpenAI)로 교체할 때는 각 함수의 반환 계약(shape)만 유지한 채
 * 본문을 프롬프트 호출로 바꾸면 된다. 파이프라인(portfolioPipeline.js)과 프론트엔드는
 * 이 계약에만 의존하므로 수정할 필요가 없다.
 */

const TECH_KEYWORDS = [
  'java', 'kotlin', 'spring', 'spring boot', 'python', 'django', 'fastapi',
  'flask', 'node', 'node.js', 'express', 'nestjs', 'react', 'next.js',
  'vue', 'typescript', 'javascript', 'redis', 'kafka', 'mysql', 'postgresql',
  'mongodb', 'docker', 'kubernetes', 'aws', 'gcp', 'ci/cd', 'graphql',
  'rest api', 'msa', 'jenkins', 'git', 'linux',
];

function findKeywords(text) {
  const lower = text.toLowerCase();
  return TECH_KEYWORDS.filter((kw) => lower.includes(kw));
}

/**
 * Role: GitHub Repository 분석 전문가
 * Goal: 추출된 근거(README 발췌, tech stack)로부터 프로젝트 목적/설명 서술을 생성한다.
 * Input: { projectName, readmeExcerpt, techStack }
 * Output: { purpose, description }
 * Forbidden: README/설정 파일에 없는 목적/기능 추론
 */
function isProseLine(line) {
  if (line.length < 20) return false;
  if (/^[#<[!]/.test(line)) return false; // 헤더, HTML 태그, 뱃지/이미지 문법 제외
  if (!/[a-zA-Z가-힣]{5,}/.test(line)) return false;
  return true;
}

export function summarizeProject({ projectName, readmeExcerpt, techStack }) {
  const firstSentence = (readmeExcerpt || '')
    .split(/\n+/)
    .map((line) => line.trim())
    .find(isProseLine) || '';

  const techPart = techStack.length > 0 ? techStack.join(', ') : '기술 스택 정보 없음';

  const description = firstSentence
    ? firstSentence.slice(0, 200)
    : 'README에서 설명을 찾을 수 없습니다.';

  const purpose = firstSentence
    ? `README 내용에 따르면 ${projectName}은(는) "${description}"를 목표로 하며, ${techPart} 기술을 사용합니다.`
    : `${projectName}의 README 설명이 부족해 목적을 확정할 수 없습니다. (기술 스택: ${techPart})`;

  return { purpose, description, confidence: firstSentence ? 0.6 : 0.2 };
}

/**
 * Role: 채용공고 분석 전문가
 * Goal: JD 텍스트를 구조화한다.
 * Input: jdText (string)
 * Output: JDMetadataSchema { position, required_skills, preferred_skills, keywords, responsibilities }
 * Forbidden: 단순 키워드 개수로 우대/필수를 뒤바꾸지 않는다.
 */
export function analyzeJD(jdText) {
  const text = jdText || '';
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const requiredIdx = lines.findIndex((l) => /필수|자격\s*요건|required/i.test(l));
  const preferredIdx = lines.findIndex((l) => /우대|preferred/i.test(l));

  const requiredBlock = requiredIdx >= 0
    ? lines.slice(requiredIdx + 1, preferredIdx > requiredIdx ? preferredIdx : requiredIdx + 8).join(' ')
    : text;
  const preferredBlock = preferredIdx >= 0
    ? lines.slice(preferredIdx + 1, preferredIdx + 8).join(' ')
    : '';

  const required_skills = findKeywords(requiredBlock);
  const preferred_skills = findKeywords(preferredBlock).filter((k) => !required_skills.includes(k));
  const keywords = Array.from(new Set(findKeywords(text)));

  const positionLine = lines.find((l) => /백엔드|프론트엔드|풀스택|backend|frontend|developer|engineer/i.test(l));
  const responsibilities = lines
    .filter((l) => /담당|역할|업무|responsibility/i.test(l))
    .slice(0, 5);

  return {
    position: positionLine || '',
    required_skills,
    preferred_skills,
    keywords,
    responsibilities,
  };
}

/**
 * Role: 포트폴리오 스토리 작성 전문가
 * Goal: 선정된 프로젝트를 JD에 맞춘 스토리(매칭 이유 + 슬라이드 서술)로 재구성한다.
 * Input: { projectMetadata, jdMetadata, highlightPoints }
 * Output: { matchingReason, sections: [{ title, content }] }
 * Forbidden: Evidence에 없는 성과 수치, 과장된 표현 생성
 */
export function writeStory({ projectMetadata, jdMetadata, highlightPoints }) {
  const techStack = [
    ...(projectMetadata.tech_stack?.language || []),
    ...(projectMetadata.tech_stack?.framework || []),
  ];

  const highlightText = highlightPoints.length > 0
    ? highlightPoints.join(', ')
    : '직접적으로 겹치는 기술 스택은 없지만';

  const matchingReason = highlightPoints.length > 0
    ? `이 프로젝트는 ${highlightText} 경험을 갖추고 있어 "${jdMetadata.position || '해당 공고'}"의 요구사항과 연결됩니다.`
    : `기술 스택 교집합은 크지 않지만, ${projectMetadata.description || '프로젝트 경험'}이 해당 직무 이해에 참고가 될 수 있습니다.`;

  const sections = [
    {
      title: 'Problem',
      content: projectMetadata.purpose || '프로젝트가 해결하려던 문제를 README에서 찾지 못했습니다.',
    },
    {
      title: 'Solution',
      content: techStack.length > 0
        ? `${techStack.join(', ')}을(를) 활용해 구현했습니다.`
        : '사용 기술 정보가 부족합니다.',
    },
    {
      title: 'Result',
      content: '실제 성과 수치는 Evidence(README/문서)에서 확인되지 않아, 생성하지 않았습니다.',
    },
  ];

  return { matchingReason, sections };
}
