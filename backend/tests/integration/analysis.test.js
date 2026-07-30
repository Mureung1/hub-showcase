import { describe, it, expect, vi, afterAll, afterEach } from 'vitest';
import request from 'supertest';

// GitHub 호출은 mock, DB는 실제 Supabase에 연결한다 (docs/testing.md 정책)
vi.mock('../../src/services/githubService.js', () => ({
    fetchUserProfile: vi.fn(),
}));

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');
const { fetchUserProfile } = await import('../../src/services/githubService.js');

const TEST_GITHUB_ID = 'vitest-analysis-user';
// POST는 GET과 같은 행을 upsert하므로 캐시 상태가 섞이지 않게 별도 식별자를 쓴다
const POST_GITHUB_ID = 'vitest-analysis-post';
const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// fetchUserProfile 반환 형식 (githubService.js 상단 주석 참조)
function buildProfile(githubId = POST_GITHUB_ID) {
    return {
        githubId,
        languageWeights: [{ name: 'JavaScript', weight: 80 }, { name: 'Python', weight: 20 }],
        recentRepos: [{ nameWithOwner: `${githubId}/my-app`, commits: 42 }],
        contributedRepos: [{ nameWithOwner: 'octocat/Hello-World', stars: 2000 }],
        totals: { commits: 60, pullRequests: 2, issues: 1, contributedRepos: 1, ownRepos: 3 },
    };
}

afterEach(() => {
    fetchUserProfile.mockReset();
});

afterAll(async () => {
    await prisma.analysis.deleteMany({ where: { githubId: { in: [TEST_GITHUB_ID, POST_GITHUB_ID] } } });
    await prisma.$disconnect();
});

describe('POST /api/analysis', () => {
    it('캐시가 없으면 GitHub 프로필로 분석하고 결과를 저장한다', async () => {
        await prisma.analysis.deleteMany({ where: { githubId: POST_GITHUB_ID } });
        fetchUserProfile.mockResolvedValueOnce(buildProfile());

        const res = await request(app).post('/api/analysis').send({ githubId: POST_GITHUB_ID });

        expect(res.status).toBe(200);
        expect(res.body.githubId).toBe(POST_GITHUB_ID);
        // 커밋 60 → intermediate (analysisService judgeSkillLevel 규칙)
        expect(res.body.skillLevel).toBe('intermediate');
        expect(res.body.languages).toEqual([
            { name: 'JavaScript', ratio: 0.8 },
            { name: 'Python', ratio: 0.2 },
        ]);
        expect(res.body.activitySummary.commits).toBe(60);

        // 응답만 맞고 DB에 안 남으면 다음 요청이 또 GitHub를 부른다 — 저장까지 확인
        const saved = await prisma.analysis.findUnique({ where: { githubId: POST_GITHUB_ID } });
        expect(saved).not.toBeNull();
        expect(saved.skillLevel).toBe('intermediate');
    });

    it('24시간 이내 캐시가 있으면 GitHub를 호출하지 않는다', async () => {
        await prisma.analysis.upsert({
            where: { githubId: POST_GITHUB_ID },
            // 앞 테스트가 남긴 행이 있을 수 있으므로 update에도 전 필드를 넣어 픽스처를 고정한다
            update: {
                languages: [{ name: 'Go', ratio: 1 }],
                skillLevel: 'beginner',
                analyzedAt: new Date(),
            },
            create: {
                githubId: POST_GITHUB_ID,
                languages: [{ name: 'Go', ratio: 1 }],
                skillLevel: 'beginner',
                activitySummary: { commits: 1, pullRequests: 0, issues: 0, contributedRepos: 0 },
                analyzedAt: new Date(),
            },
        });

        const res = await request(app).post('/api/analysis').send({ githubId: POST_GITHUB_ID });

        expect(res.status).toBe(200);
        expect(res.body.languages).toEqual([{ name: 'Go', ratio: 1 }]);
        expect(fetchUserProfile).not.toHaveBeenCalled();
    });

    it('캐시가 24시간을 넘으면 GitHub를 다시 호출해 갱신한다', async () => {
        const expiredAt = new Date(Date.now() - CACHE_TTL_MS - 1000);
        await prisma.analysis.upsert({
            where: { githubId: POST_GITHUB_ID },
            update: { analyzedAt: expiredAt, skillLevel: 'beginner' },
            create: {
                githubId: POST_GITHUB_ID,
                languages: [{ name: 'Go', ratio: 1 }],
                skillLevel: 'beginner',
                activitySummary: { commits: 1, pullRequests: 0, issues: 0, contributedRepos: 0 },
                analyzedAt: expiredAt,
            },
        });
        fetchUserProfile.mockResolvedValueOnce(buildProfile());

        const res = await request(app).post('/api/analysis').send({ githubId: POST_GITHUB_ID });

        expect(res.status).toBe(200);
        expect(fetchUserProfile).toHaveBeenCalledWith(POST_GITHUB_ID);
        expect(res.body.skillLevel).toBe('intermediate');
        expect(new Date(res.body.analyzedAt).getTime()).toBeGreaterThan(expiredAt.getTime());
    });

    it('githubId가 없거나 형식을 벗어나면 400 VALIDATION_ERROR를 반환한다', async () => {
        const missing = await request(app).post('/api/analysis').send({});
        expect(missing.status).toBe(400);
        expect(missing.body.error.code).toBe('VALIDATION_ERROR');

        const malformed = await request(app).post('/api/analysis').send({ githubId: '-bad-id-' });
        expect(malformed.status).toBe(400);
        expect(malformed.body.error.code).toBe('VALIDATION_ERROR');

        expect(fetchUserProfile).not.toHaveBeenCalled();
    });

    it('없는 GitHub 사용자면 404 USER_NOT_FOUND를 반환한다', async () => {
        const notFound = new Error('해당 GitHub 사용자를 찾을 수 없습니다.');
        notFound.status = 404;
        notFound.code = 'USER_NOT_FOUND';
        fetchUserProfile.mockRejectedValueOnce(notFound);

        const res = await request(app).post('/api/analysis').send({ githubId: `${POST_GITHUB_ID}-none` });

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('GitHub rate limit이면 429 RATE_LIMITED를 반환한다 (POST는 폴백할 저장본이 없다)', async () => {
        const rateLimited = new Error('GitHub API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
        rateLimited.status = 429;
        rateLimited.code = 'RATE_LIMITED';
        fetchUserProfile.mockRejectedValueOnce(rateLimited);

        const res = await request(app).post('/api/analysis').send({ githubId: `${POST_GITHUB_ID}-limited` });

        expect(res.status).toBe(429);
        expect(res.body.error.code).toBe('RATE_LIMITED');
    });
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
