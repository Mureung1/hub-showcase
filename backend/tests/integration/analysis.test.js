import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';

// GitHub 호출은 mock, DB는 실제 Supabase에 연결한다 (docs/testing.md 정책)
vi.mock('../../src/services/githubService.js', () => ({
    fetchUserProfile: vi.fn(),
}));

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');
const { fetchUserProfile } = await import('../../src/services/githubService.js');

const TEST_GITHUB_ID = 'vitest-analysis-user';
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

afterEach(() => {
    fetchUserProfile.mockReset();
});

afterAll(async () => {
    await prisma.analysis.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
    await prisma.$disconnect();
});

describe('GET /api/analysis/:githubId', () => {
    it('분석 이력이 없으면 404 ANALYSIS_NOT_FOUND를 반환한다', async () => {
        const res = await request(app).get(`/api/analysis/${TEST_GITHUB_ID}-none`);

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });

    it('7일 이내 저장본은 GitHub를 호출하지 않고 그대로 반환한다', async () => {
        await prisma.analysis.upsert({
            where: { githubId: TEST_GITHUB_ID },
            update: { analyzedAt: new Date() },
            create: {
                githubId: TEST_GITHUB_ID,
                languages: [{ name: 'JavaScript', ratio: 1 }],
                skillLevel: 'beginner',
                activitySummary: { commits: 10, pullRequests: 1, issues: 0, contributedRepos: 0 },
                analyzedAt: new Date(),
            },
        });

        const res = await request(app).get(`/api/analysis/${TEST_GITHUB_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.githubId).toBe(TEST_GITHUB_ID);
        expect(fetchUserProfile).not.toHaveBeenCalled();
    });

    it('7일 경과 후 재분석 중 GitHub가 rate limit(429)이면 기존 stale 데이터를 그대로 반환한다', async () => {
        const staleAnalyzedAt = new Date(Date.now() - STALE_MS - 1000);
        await prisma.analysis.upsert({
            where: { githubId: TEST_GITHUB_ID },
            update: { analyzedAt: staleAnalyzedAt },
            create: {
                githubId: TEST_GITHUB_ID,
                languages: [{ name: 'JavaScript', ratio: 1 }],
                skillLevel: 'beginner',
                activitySummary: { commits: 10, pullRequests: 1, issues: 0, contributedRepos: 0 },
                analyzedAt: staleAnalyzedAt,
            },
        });

        const rateLimited = new Error('GitHub API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        rateLimited.status = 429;
        rateLimited.code = 'RATE_LIMITED';
        fetchUserProfile.mockRejectedValueOnce(rateLimited);

        const res = await request(app).get(`/api/analysis/${TEST_GITHUB_ID}`);

        expect(res.status).toBe(200);
        expect(res.body.githubId).toBe(TEST_GITHUB_ID);
        expect(new Date(res.body.analyzedAt).getTime()).toBe(staleAnalyzedAt.getTime());
    });

    it('7일 경과 후 재분석 중 GitHub가 그 외 에러(500)면 폴백 없이 그대로 전파한다', async () => {
        const staleAnalyzedAt = new Date(Date.now() - STALE_MS - 1000);
        await prisma.analysis.upsert({
            where: { githubId: TEST_GITHUB_ID },
            update: { analyzedAt: staleAnalyzedAt },
            create: {
                githubId: TEST_GITHUB_ID,
                languages: [{ name: 'JavaScript', ratio: 1 }],
                skillLevel: 'beginner',
                activitySummary: { commits: 10, pullRequests: 1, issues: 0, contributedRepos: 0 },
                analyzedAt: staleAnalyzedAt,
            },
        });

        fetchUserProfile.mockRejectedValueOnce(new Error('네트워크 오류'));

        const res = await request(app).get(`/api/analysis/${TEST_GITHUB_ID}`);

        expect(res.status).toBe(500);
    });
});
