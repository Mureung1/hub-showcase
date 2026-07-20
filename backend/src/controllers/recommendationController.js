import { createRecommendation } from '../services/recommendationService.js';
import { isValidGithubId } from '../utils/validators.js';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

// GitHub 언어명에 실제로 쓰이는 문자만 허용 (C++, C#, Objective-C, Jupyter Notebook 등)
// 따옴표·콜론 등을 막아 검색 qualifier 문자열 조작을 차단한다
const LANGUAGE_PATTERN = /^[A-Za-z0-9+#.\- ]{1,50}$/;

// openapi.yaml Preferences 스키마 검증 — languages(1개 이상 문자열)·difficulty(enum) 필수, topics 선택
function isValidPreferences(preferences) {
    if (!preferences || typeof preferences !== 'object') {
        return false;
    }
    const { languages, difficulty, topics } = preferences;
    if (!Array.isArray(languages) || languages.length === 0
        || !languages.every((language) => typeof language === 'string' && LANGUAGE_PATTERN.test(language))) {
        return false;
    }
    if (!DIFFICULTIES.includes(difficulty)) {
        return false;
    }
    if (topics !== undefined
        && (!Array.isArray(topics) || !topics.every((topic) => typeof topic === 'string'))) {
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
