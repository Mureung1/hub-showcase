/**
 * 07_API_SPEC.md 10장 / 05_CODE_SCANNER_SCORER.md "SSRF 방지" 참고.
 * repository_url이 실제로 github.com을 가리키는지 서버에서 검증한다.
 * 내부망 주소(예: http://169.254.169.254, http://localhost)를 GitHub URL처럼
 * 위장해 서버가 대신 접근하게 만드는 SSRF 공격을 막기 위함.
 */
export function isAllowedGithubUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }

  // hostname은 URL 파서가 "github.com@evil.com" 같은 userinfo 트릭,
  // "evil.com/github.com" 같은 path 트릭을 모두 걸러내고 실제 호스트만 반환한다.
  return parsed.protocol === 'https:' && parsed.hostname === 'github.com';
}
