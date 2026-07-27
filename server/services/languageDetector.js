/**
 * tech_stack.language 감지 — 의존성 이름이 아니라 실제 스캔된 후보 소스 파일
 * (candidateFilePaths, .js/.jsx/.ts/.tsx)의 확장자로 판단한다.
 */

const LANGUAGE_EXTENSIONS = {
  TypeScript: ['.ts', '.tsx'],
  JavaScript: ['.js', '.jsx'],
};

export function detectLanguages(candidateFilePaths) {
  const found = new Set();
  for (const { path } of candidateFilePaths) {
    const lower = path.toLowerCase();
    for (const [language, extensions] of Object.entries(LANGUAGE_EXTENSIONS)) {
      if (extensions.some((ext) => lower.endsWith(ext))) found.add(language);
    }
  }
  return [...found].sort();
}
