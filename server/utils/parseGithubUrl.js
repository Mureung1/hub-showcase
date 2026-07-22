/**
 * 오너랑 레포로 분리 후 반환
 * isAllowedGithubUrl()을 통과한 https://github.com/{owner}/{repo}... URL에서
 * owner/repo만 추출한다. 뒤에 .git, 추가 경로(/tree/main 등)가 붙어도 앞의 2개
 * path segment만 사용한다.
 */
export function parseGithubUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const segments = parsed.pathname.split('/').filter(Boolean); //빈문자열 제거 위해 필터 사용
  if (segments.length < 2) return null;

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');
  if (!owner || !repo) return null; //둘 중 하나 빈문자열이면 null반환

  return { owner, repo };
}
