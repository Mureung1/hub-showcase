import { createAnalysis } from '../services/analysisService.js';

// openapi.yaml의 githubId 패턴 (GitHub 사용자명 규칙: 영숫자·하이픈, 1~39자)
const GITHUB_ID_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

// POST /api/analysis — GitHub ID를 받아 프로필 분석 결과를 반환
export async function requestAnalysis(req, res, next) {
    const { githubId } = req.body || {};

    if (typeof githubId !== 'string' || !GITHUB_ID_PATTERN.test(githubId)) {
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
