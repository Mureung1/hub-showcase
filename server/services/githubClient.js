/**
 * GitHub REST API 호출 전담 모듈.
 * 05_CODE_SCANNER_SCORER.md 10장: 서버 전용 PAT(GITHUB_TOKEN)을 사용해
 * 비인증 60회/시간 제한을 5,000회/시간으로 상향한다.
 */

const GITHUB_API_BASE = 'https://api.github.com';

function authHeaders() {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * 레포 존재/접근 가능 여부 확인 + default_branch 획득.
 * 404/403이면 null을 반환한다 (호출부에서 REPOSITORY_NOT_FOUND로 처리).
 */
export async function fetchRepoMeta(owner, repo) {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;

  const body = await res.json();
  return { defaultBranch: body.default_branch };
}

/**
 * 파일 목록 수집 (05_CODE_SCANNER_SCORER.md 10장: recursive=1로 1회 호출).
 * truncated가 true면 GitHub이 응답을 잘랐다는 뜻이라 전체 목록을 신뢰할 수 없다.
 */
export async function fetchTree(owner, repo, branch) {
  const res = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: authHeaders() }
  );
  if (!res.ok) return null;

  const body = await res.json();
  return {
    entries: body.tree || [],
    truncated: Boolean(body.truncated),
  };
}

/**
 * 후보 파일 원문 조회 (05_CODE_SCANNER_SCORER.md 10장: 최종 후보 3~5개 파일에 대해서만 raw content를 가져온다).
 * Tree 조회 시 이미 받아둔 blob sha로 곧장 조회하므로 경로 기반 재조회가 필요 없다.
 * 실패하면 null (호출부에서 다음 후보로 폴백).
 */
export async function fetchBlobContent(owner, repo, sha) {
  const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${sha}`, {
    headers: authHeaders(),
  });
  if (!res.ok) return null;

  const body = await res.json();
  if (body.encoding !== 'base64') return null;

  return Buffer.from(body.content, 'base64').toString('utf-8');
}
