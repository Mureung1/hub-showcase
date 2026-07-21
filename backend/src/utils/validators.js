// openapi.yaml의 githubId 패턴 (GitHub 사용자명 규칙: 영숫자·하이픈, 1~39자)
const GITHUB_ID_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function isValidGithubId(githubId) {
    return typeof githubId === 'string' && GITHUB_ID_PATTERN.test(githubId);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id) {
    return typeof id === 'string' && UUID_PATTERN.test(id);
}
