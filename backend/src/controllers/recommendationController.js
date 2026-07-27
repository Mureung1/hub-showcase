import { createRecommendation, getRecommendationById, listRecommendationHistory } from '../services/recommendationService.js';
import { isValidGithubId, isValidUuid, isValidPreferences, isValidRepoFullName, isValidIssueNumber } from '../utils/validators.js';

// GET /api/recommendations/:id의 선택적 repoFullName/issueNumber 쿼리 → focus 객체.
// 둘 다 없으면 null(캐시값만 병합, LLM 미호출). 하나만 있거나 형식이 안 맞으면 false(400 대상)
function parseFocus(query) {
    const { repoFullName, issueNumber } = query;
    if (repoFullName === undefined && issueNumber === undefined) {
        return null;
    }
    const parsedIssueNumber = Number(issueNumber);
    if (!isValidRepoFullName(repoFullName) || !isValidIssueNumber(parsedIssueNumber)) {
        return false;
    }
    return { repoFullName, issueNumber: parsedIssueNumber };
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

// GET /api/recommendations?githubId= — 이 사용자가 지금까지 검색한 전체 이력(세션별 배열)
export async function getRecommendationHistory(req, res, next) {
    const { githubId } = req.query;

    if (!isValidGithubId(githubId)) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '올바른 GitHub 사용자명을 입력해주세요.' },
        });
        return;
    }

    try {
        const history = await listRecommendationHistory(githubId);
        res.status(200).json(history);
    } catch (error) {
        next(error);
    }
}

// GET /api/recommendations/:id — 저장된 추천 재조회
// 상세 화면 진입 시 repoFullName/issueNumber를 함께 보내면 그 이슈만 LLM 분석을 지연 생성한다(#6)
export async function getRecommendation(req, res, next) {
    const { id } = req.params;
    const focus = parseFocus(req.query);

    if (!isValidUuid(id) || focus === false) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '추천 id 또는 repoFullName/issueNumber 형식이 올바르지 않습니다.' },
        });
        return;
    }

    try {
        const recommendation = await getRecommendationById(id, focus);
        res.status(200).json(recommendation);
    } catch (error) {
        next(error);
    }
}
