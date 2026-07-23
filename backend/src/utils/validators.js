// openapi.yaml의 githubId 패턴 (GitHub 사용자명 규칙: 영숫자·하이픈, 1~39자)
const GITHUB_ID_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export function isValidGithubId(githubId) {
    return typeof githubId === 'string' && GITHUB_ID_PATTERN.test(githubId);
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id) {
    return typeof id === 'string' && UUID_PATTERN.test(id);
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// GitHub 언어명에 실제로 쓰이는 문자만 허용 (C++, C#, Objective-C, Jupyter Notebook 등)
// 따옴표·콜론 등을 막아 검색 qualifier 문자열 조작을 차단한다
const LANGUAGE_PATTERN = /^[A-Za-z0-9+#.\- ]{1,50}$/;
// 토픽은 검색 qualifier에 안 들어가고 로컬 매칭에만 쓰이므로 한글 등 유니코드 문자도 허용한다
// (LANGUAGE_PATTERN처럼 ASCII로 제한하면 안 됨 — 언어명은 qualifier에 직접 들어가 인젝션 위험이 있지만 토픽은 아님)
const TOPIC_PATTERN = /^[\p{L}\p{N}\- ]{1,50}$/u;

// recommendationService의 MAX_LANGUAGES(검색에 실제 쓰는 상한, 3)보다 넉넉하게 잡아 입력만 방어한다
// — 초과분은 collectCandidateRepos가 조용히 잘라 쓰므로 여기서는 남용(수백 개 배열 등) 차단이 목적
const MAX_LANGUAGES_INPUT = 10;
const MAX_TOPICS = 10;

// openapi.yaml Preferences 스키마 검증 — languages(1개 이상 문자열)·difficulty(enum) 필수, topics 선택
export function isValidPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
        return false;
    }
    const { languages, difficulty, topics } = preferences;
    if (!Array.isArray(languages) || languages.length === 0 || languages.length > MAX_LANGUAGES_INPUT
        || !languages.every((language) => typeof language === 'string' && LANGUAGE_PATTERN.test(language))) {
        return false;
    }
    if (!DIFFICULTIES.includes(difficulty)) {
        return false;
    }
    if (topics !== undefined && (!Array.isArray(topics) || topics.length > MAX_TOPICS
        || !topics.every((topic) => typeof topic === 'string' && TOPIC_PATTERN.test(topic)))) {
        return false;
    }
    return true;
}
