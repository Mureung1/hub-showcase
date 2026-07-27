import { addFavorite, removeFavorite } from '../services/favoriteService.js';
import { isValidGithubId, isValidRepoFullName, isValidIssueNumber } from '../utils/validators.js';

// body { githubId, repoFullName, issueNumber } 공통 검증 — 형식이 틀리면 null
function parseFavoriteBody(body) {
    const { githubId, repoFullName } = body || {};
    const issueNumber = Number(body?.issueNumber);
    if (!isValidGithubId(githubId) || !isValidRepoFullName(repoFullName) || !isValidIssueNumber(issueNumber)) {
        return null;
    }
    return { githubId, repoFullName, issueNumber };
}

// POST /api/favorites — 즐겨찾기 추가 (idempotent)
export async function createFavorite(req, res, next) {
    const parsed = parseFavoriteBody(req.body);
    if (!parsed) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'githubId, repoFullName, issueNumber를 확인해주세요.' },
        });
        return;
    }

    try {
        await addFavorite(parsed.githubId, parsed.repoFullName, parsed.issueNumber);
        res.status(200).json({ favorited: true });
    } catch (error) {
        next(error);
    }
}

// DELETE /api/favorites — 즐겨찾기 삭제 (idempotent)
export async function deleteFavorite(req, res, next) {
    const parsed = parseFavoriteBody(req.body);
    if (!parsed) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'githubId, repoFullName, issueNumber를 확인해주세요.' },
        });
        return;
    }

    try {
        await removeFavorite(parsed.githubId, parsed.repoFullName, parsed.issueNumber);
        res.status(200).json({ favorited: false });
    } catch (error) {
        next(error);
    }
}
