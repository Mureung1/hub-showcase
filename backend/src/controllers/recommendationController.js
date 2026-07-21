import { createRecommendation, getRecommendationById } from '../services/recommendationService.js';
import { isValidGithubId, isValidUuid } from '../utils/validators.js';

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
function isValidPreferences(preferences) {
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

// POST /api/recommendations — 분석 결과 + 선호 조건으로 추천 생성·저장 후 반환
export async function requestRecommendation(req, res, next) {
    const { githubId, preferences } = req.body || {};

    if (!isValidGithubId(githubId) || !isValidPreferences(preferences)) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'githubId와 선호 조건(languages, difficulty)을 확인해주세요.' },
        });
        return;
    }

    try {
        const recommendation = await createRecommendation(githubId, {
            languages: preferences.languages,
            difficulty: preferences.difficulty,
            topics: preferences.topics ?? [],
        });
        res.status(200).json(recommendation);
    } catch (error) {
        next(error);
    }
}

// GET /api/recommendations/:id — 저장된 추천 재조회
export async function getRecommendation(req, res, next) {
    const { id } = req.params;

    if (!isValidUuid(id)) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '추천 id 형식이 올바르지 않습니다.' },
        });
        return;
    }

    try {
        const recommendation = await getRecommendationById(id);
        res.status(200).json(recommendation);
    } catch (error) {
        next(error);
    }
}
