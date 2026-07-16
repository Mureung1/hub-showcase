import { createAnalysis, getAnalysis } from '../services/analysisService.js';

// openapi.yaml의 githubId 패턴 (GitHub 사용자명 규칙: 영숫자·하이픈, 1~39자)
const GITHUB_ID_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function isValidGithubId(githubId) {
    return typeof githubId === 'string' && GITHUB_ID_PATTERN.test(githubId);
}

// POST /api/analysis — GitHub ID를 받아 프로필 분석 결과를 반환 (24시간 캐시)
export async function requestAnalysis(req, res, next) {
    const { githubId } = req.body || {};

    if (!isValidGithubId(githubId)) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '올바른 GitHub 사용자명을 입력해주세요.' },
        });
        return;
    }

    try {
        const analysis = await createAnalysis(githubId);
        res.status(200).json(analysis);
    } catch (error) {
        next(error);
    }
}

// GET /api/analysis/:githubId — 저장된 분석 결과 조회 (GitHub 호출 없음)
export async function findAnalysis(req, res, next) {
    const { githubId } = req.params;

    if (!isValidGithubId(githubId)) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: '올바른 GitHub 사용자명을 입력해주세요.' },
        });
        return;
    }

    try {
        const analysis = await getAnalysis(githubId);
        res.status(200).json(analysis);
    } catch (error) {
        next(error);
    }
}
