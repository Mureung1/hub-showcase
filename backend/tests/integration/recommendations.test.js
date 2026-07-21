import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

// GitHub 호출은 mock, DB는 실제 Supabase에 연결한다 (docs/testing.md 정책)
// — rate limit·플레이키니스를 피하고, 라우트→컨트롤러→서비스→DB 저장까지의 실제 배선을 검증한다
vi.mock('../../src/services/githubService.js', () => ({
    searchRepos: vi.fn().mockResolvedValue(['octocat/Hello-World']),
    fetchReposWithIssues: vi.fn().mockResolvedValue([
        {
            fullName: 'octocat/Hello-World',
            description: 'mock repo',
            url: 'https://github.com/octocat/Hello-World',
            stars: 500,
            primaryLanguage: 'JavaScript',
            languages: ['JavaScript'],
            topics: [],
            goodFirstIssueCount: 3,
            helpWantedIssueCount: 1,
            pushedAt: new Date().toISOString(),
            issues: [
                { number: 1, title: 'mock issue', url: 'https://github.com/octocat/Hello-World/issues/1', labels: ['good first issue'] },
            ],
        },
    ]),
}));

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');

const TEST_GITHUB_ID = 'vitest-test-user';
const createdRecommendationIds = [];

// 실제 GitHub 분석 없이도 추천 API를 테스트할 수 있도록 분석 캐시를 직접 심어둔다
beforeAll(async () => {
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
});

afterAll(async () => {
    await prisma.recommendation.deleteMany({ where: { id: { in: createdRecommendationIds } } });
    await prisma.analysis.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
    await prisma.$disconnect();
});

describe('POST /api/recommendations', () => {
    it('분석 이력이 있는 사용자의 추천을 생성·저장한다 (GitHub는 mock)', async () => {
        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] },
            });

        expect(res.status).toBe(200);
        expect(res.body.githubId).toBe(TEST_GITHUB_ID);
        expect(res.body.items.length).toBeGreaterThan(0);
        expect(res.body.items[0].repoFullName).toBe('octocat/Hello-World');
        createdRecommendationIds.push(res.body.id);
    });

    it('languages 배열이 상한(10개)을 넘으면 400을 반환한다', async () => {
        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: Array.from({ length: 11 }, (_, i) => `Lang${i}`), difficulty: 'easy' },
            });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('GET /api/recommendations/:id', () => {
    it('생성된 추천을 id로 재조회한다', async () => {
        const created = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] },
            });
        createdRecommendationIds.push(created.body.id);

        const res = await request(app).get(`/api/recommendations/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(created.body.id);
    });

    it('존재하지 않는 uuid는 404 RECOMMENDATION_NOT_FOUND를 반환한다', async () => {
        const res = await request(app).get('/api/recommendations/00000000-0000-0000-0000-000000000000');

        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('RECOMMENDATION_NOT_FOUND');
    });

    it('형식이 잘못된 id는 400 VALIDATION_ERROR를 반환한다', async () => {
        const res = await request(app).get('/api/recommendations/not-a-uuid');

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});
