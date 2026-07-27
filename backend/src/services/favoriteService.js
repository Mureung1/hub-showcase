import prisma from '../config/prisma.js';

// 즐겨찾기 추가 — 이미 있으면 그대로 두는 upsert(idempotent). 토글 버튼이 연타돼도 에러 없이 동일 결과
export async function addFavorite(githubId, repoFullName, issueNumber) {
    await prisma.favorite.upsert({
        where: { githubId_repoFullName_issueNumber: { githubId, repoFullName, issueNumber } },
        update: {},
        create: { githubId, repoFullName, issueNumber },
    });
}

// 즐겨찾기 삭제 — 없어도 에러 없이 조용히 끝남(idempotent)
export async function removeFavorite(githubId, repoFullName, issueNumber) {
    await prisma.favorite.deleteMany({ where: { githubId, repoFullName, issueNumber } });
}

// 이 githubId가 즐겨찾기한 (repoFullName#issueNumber) 집합 — recommendationService의 getSeenIssueKeys와 동일한 패턴
export async function getFavoriteKeys(githubId) {
    const favorites = await prisma.favorite.findMany({
        where: { githubId },
        select: { repoFullName: true, issueNumber: true },
    });
    return new Set(favorites.map((favorite) => `${favorite.repoFullName}#${favorite.issueNumber}`));
}
