/**
 * 05_CODE_SCANNER_SCORER.md 8장 "tech_stack 매핑 규칙"의 입력 준비 단계.
 * package.json / docker-compose.yml 원문에서 의존성/이미지 이름만 순수하게
 * 뽑아낸다(분류는 techStackMapper.js가 담당).
 */

const IMAGE_LINE_REGEX = /^\s*image:\s*["']?([^"'\s]+)["']?\s*$/gm;

export function parsePackageJsonDependencies(content) {
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const deps = { ...(parsed.dependencies || {}), ...(parsed.devDependencies || {}) };
  return Object.keys(deps);
}

export function parseDockerComposeImages(content) {
  const names = [];
  let match;
  IMAGE_LINE_REGEX.lastIndex = 0;
  while ((match = IMAGE_LINE_REGEX.exec(content)) !== null) {
    const raw = match[1];
    const withoutTag = raw.split(':')[0];
    const withoutNamespace = withoutTag.split('/').pop();
    if (withoutNamespace) names.push(withoutNamespace);
  }
  return names;
}
