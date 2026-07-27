import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
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
                // difficulty가 다른 이슈 2개 — 재순위(#6) 테스트에서 순서가 실제로 바뀌는지 보려면
                // 기본(규칙 점수) 순위가 결정적으로 갈리는 후보가 최소 2개 필요하다.
                // easy 선호 조건일 때 issue 1(good first issue)이 issue 2(help wanted)보다 항상 규칙 점수가 높다.
                { number: 1, title: 'mock issue 1', url: 'https://github.com/octocat/Hello-World/issues/1', labels: ['good first issue'] },
                { number: 2, title: 'mock issue 2', url: 'https://github.com/octocat/Hello-World/issues/2', labels: ['help wanted'] },
            ],
        },
    ]),
    fetchIssueBody: vi.fn().mockResolvedValue('mock issue body'),
    fetchContributingGuide: vi.fn().mockResolvedValue(null),
}));

// #6 LLM 이슈 분석·재순위도 GitHub와 같은 이유로 mock한다 (docs/testing.md 외부 의존성 처리 원칙과 동일)
vi.mock('../../src/services/llmService.js', () => ({
    analyzeIssue: vi.fn().mockResolvedValue({
        issueSummary: 'mock 요약',
        requiredSkills: ['JavaScript'],
        guide: ['mock 1단계'],
    }),
    // 기본은 무보정(±0) — 재순위 관련 없는 기존 테스트들의 순위·응답이 그대로 유지되게 한다
    rerankItems: vi.fn().mockImplementation((items) => Promise.resolve(items.map(() => ({ adjustment: 0, reason: 'mock rerank reason' })))),
}));

const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');
const { analyzeIssue, rerankItems } = await import('../../src/services/llmService.js');
const { fetchReposWithIssues } = await import('../../src/services/githubService.js');

const TEST_GITHUB_ID = 'vitest-test-user';
const createdRecommendationIds = [];

// 실제 GitHub 분석 없이도 추천 API를 테스트할 수 있도록 분석 캐시를 직접 심어둔다.
// 이전 실행이 afterAll을 못 돌고 죽었을 경우(타임아웃 등)를 대비해 먼저 잔여 데이터를 정리한다.
const MOCK_REPO_FULL_NAME = 'octocat/Hello-World';
const MOCK_ISSUE_NUMBER = 1;

beforeAll(async () => {
    await prisma.recommendation.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
    // fetchReposWithIssues mock이 항상 같은 이슈를 반환하므로, 이전 실행에서 남은 LLM 분석 캐시를 지워
    // #6 테스트가 "아직 미분석" 상태에서 결정적으로 시작하도록 한다
    await prisma.issueCache.deleteMany({ where: { repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER } });
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

// 재추천 다양화(하루 상한 3회)가 기존 테스트들의 누적 POST 횟수에 걸리지 않도록,
// 매 테스트 시작 전 이 사용자의 추천 이력을 비운다 — 테스트 간 상한/다양화 상태도 함께 격리된다
beforeEach(async () => {
    await prisma.recommendation.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
});

afterAll(async () => {
    await prisma.recommendation.deleteMany({ where: { id: { in: createdRecommendationIds } } });
    await prisma.analysis.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
    await prisma.issueCache.deleteMany({
        where: { repoFullName: MOCK_REPO_FULL_NAME, issueNumber: { in: [MOCK_ISSUE_NUMBER, 101, 102] } },
    });
    await prisma.favorite.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
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

    it('한글 등 유니코드 토픽 입력을 400으로 막지 않는다', async () => {
        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: ['머신러닝'] },
            });

        expect(res.status).toBe(200);
        createdRecommendationIds.push(res.body.id);
    });

    it('LLM 재순위가 규칙 점수보다 우세하면 순위가 실제로 뒤바뀐다', async () => {
        // 규칙 점수는 issue 1(easy 일치)이 issue 2(help wanted)보다 항상 높지만,
        // 재순위에서 issue 2에 +15, issue 1에 -15를 줘서 뒤집히는지 확인한다 (배치 응답 1개로 전달)
        rerankItems.mockImplementation((items) =>
            Promise.resolve(items.map((item) =>
                item.issueTitle === 'mock issue 2'
                    ? { adjustment: 15, reason: '재순위: 관심사와 잘 맞아요' }
                    : { adjustment: -15, reason: '재순위: 다소 애매해요' })));

        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] },
            });

        expect(res.status).toBe(200);
        expect(res.body.items[0].issueNumber).toBe(2);
        expect(res.body.items[0].reason).toBe('재순위: 관심사와 잘 맞아요');
        createdRecommendationIds.push(res.body.id);

        rerankItems.mockImplementation((items) => Promise.resolve(items.map(() => ({ adjustment: 0, reason: 'mock rerank reason' }))));
    });

    it('일부 이슈만 재순위 응답에 없어도(null) 그 항목은 규칙 점수 그대로 200을 반환한다', async () => {
        rerankItems.mockImplementation((items) =>
            Promise.resolve(items.map((item) =>
                item.issueTitle === 'mock issue 1' ? null : { adjustment: 5, reason: '재순위 이유' })));

        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] },
            });

        expect(res.status).toBe(200);
        const issue1 = res.body.items.find((item) => item.issueNumber === 1);
        expect(issue1.reason).not.toBe('재순위 이유'); // 규칙 reason 그대로 유지
        createdRecommendationIds.push(res.body.id);

        rerankItems.mockImplementation((items) => Promise.resolve(items.map(() => ({ adjustment: 0, reason: 'mock rerank reason' }))));
    });

    it('rerankItems 전체가 실패해도(빈 배열) 규칙 점수 그대로 200을 반환한다', async () => {
        rerankItems.mockImplementation((items) => Promise.resolve(items.map(() => null)));

        const res = await request(app)
            .post('/api/recommendations')
            .send({
                githubId: TEST_GITHUB_ID,
                preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] },
            });

        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThan(0);
        createdRecommendationIds.push(res.body.id);

        rerankItems.mockImplementation((items) => Promise.resolve(items.map(() => ({ adjustment: 0, reason: 'mock rerank reason' }))));
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

describe('GET /api/recommendations/:id — #6 이슈 분석(지연 생성)', () => {
    it('repoFullName/issueNumber 없이 조회하면 LLM을 호출하지 않고 미캐시 이슈는 null로 응답한다', async () => {
        const created = await request(app)
            .post('/api/recommendations')
            .send({ githubId: TEST_GITHUB_ID, preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] } });
        createdRecommendationIds.push(created.body.id);

        analyzeIssue.mockClear();
        const res = await request(app).get(`/api/recommendations/${created.body.id}`);

        expect(res.status).toBe(200);
        expect(res.body.items[0].issueSummary).toBeNull();
        expect(res.body.items[0].requiredSkills).toBeNull();
        expect(res.body.items[0].guide).toBeNull();
        expect(analyzeIssue).not.toHaveBeenCalled();
    });

    it('focus 파라미터로 미캐시 이슈를 지정하면 LLM 분석을 실행하고 IssueCache에 영구 저장한다', async () => {
        const created = await request(app)
            .post('/api/recommendations')
            .send({ githubId: TEST_GITHUB_ID, preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] } });
        createdRecommendationIds.push(created.body.id);

        analyzeIssue.mockClear();
        const res = await request(app)
            .get(`/api/recommendations/${created.body.id}`)
            .query({ repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.items[0].issueSummary).toBe('mock 요약');
        expect(res.body.items[0].requiredSkills).toEqual(['JavaScript']);
        expect(res.body.items[0].guide).toEqual(['mock 1단계']);
        expect(analyzeIssue).toHaveBeenCalledTimes(1);

        const cached = await prisma.issueCache.findUnique({
            where: { repoFullName_issueNumber: { repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER } },
        });
        expect(cached.issueSummary).toBe('mock 요약');
    });

    it('이미 캐시된 이슈는 같은 focus로 재조회해도 LLM을 다시 호출하지 않는다', async () => {
        const created = await request(app)
            .post('/api/recommendations')
            .send({ githubId: TEST_GITHUB_ID, preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] } });
        createdRecommendationIds.push(created.body.id);

        analyzeIssue.mockClear();
        const res = await request(app)
            .get(`/api/recommendations/${created.body.id}`)
            .query({ repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.items[0].issueSummary).toBe('mock 요약');
        expect(analyzeIssue).not.toHaveBeenCalled();
    });

    it('LLM 분석이 실패(null)하면 200 + null 필드로 응답하고 캐시에는 아무것도 남기지 않는다', async () => {
        await prisma.issueCache.update({
            where: { repoFullName_issueNumber: { repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER } },
            data: { issueSummary: null, requiredSkills: null, guide: null, analyzedAt: null },
        });
        const created = await request(app)
            .post('/api/recommendations')
            .send({ githubId: TEST_GITHUB_ID, preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] } });
        createdRecommendationIds.push(created.body.id);

        analyzeIssue.mockResolvedValueOnce(null);
        const res = await request(app)
            .get(`/api/recommendations/${created.body.id}`)
            .query({ repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.items[0].issueSummary).toBeNull();

        const cached = await prisma.issueCache.findUnique({
            where: { repoFullName_issueNumber: { repoFullName: MOCK_REPO_FULL_NAME, issueNumber: MOCK_ISSUE_NUMBER } },
        });
        expect(cached.issueSummary).toBeNull();
    });

    it('repoFullName만 있고 issueNumber가 없으면 400 VALIDATION_ERROR를 반환한다', async () => {
        const created = await request(app)
            .post('/api/recommendations')
            .send({ githubId: TEST_GITHUB_ID, preferences: { languages: ['JavaScript'], difficulty: 'easy', topics: [] } });
        createdRecommendationIds.push(created.body.id);

        const res = await request(app)
            .get(`/api/recommendations/${created.body.id}`)
            .query({ repoFullName: MOCK_REPO_FULL_NAME });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('POST /api/recommendations — 재추천 다양화', () => {
    const preferences = { languages: ['JavaScript'], difficulty: 'easy', topics: [] };

    it('같은 githubId로 하루 3회를 초과해 요청하면 4번째부터는 새로 계산하지 않고 오늘 마지막 결과를 그대로 반환한다', async () => {
        let lastId;
        for (let i = 0; i < 3; i += 1) {
            const res = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
            expect(res.status).toBe(200);
            createdRecommendationIds.push(res.body.id);
            lastId = res.body.id;
        }

        const res = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(lastId); // 새 레코드를 만들지 않고 3번째(가장 최근) 결과를 그대로 재사용
    });

    it('매칭 점수가 같은 이슈들 사이에서는 안 본 이슈를 먼저 배치한다 (점수 자체는 항상 1순위 정렬 기준)', async () => {
        // 1차: 이슈 101(good first issue, easy 일치 → 규칙 점수 높음) 하나만 후보로 줘서 "이미 본 이슈"로 만든다
        fetchReposWithIssues.mockResolvedValueOnce([
            {
                fullName: MOCK_REPO_FULL_NAME,
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
                    { number: 101, title: 'seen issue', url: 'https://github.com/octocat/Hello-World/issues/101', labels: ['good first issue'] },
                ],
            },
        ]);
        const first = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        expect(first.status).toBe(200);
        createdRecommendationIds.push(first.body.id);

        // 2차: 이슈 101(이미 본 이슈)과 이슈 102(새 이슈) 둘 다 라벨이 같아(good first issue) 규칙 점수가 동점이다
        fetchReposWithIssues.mockResolvedValueOnce([
            {
                fullName: MOCK_REPO_FULL_NAME,
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
                    { number: 101, title: 'seen issue', url: 'https://github.com/octocat/Hello-World/issues/101', labels: ['good first issue'] },
                    { number: 102, title: 'new issue', url: 'https://github.com/octocat/Hello-World/issues/102', labels: ['good first issue'] },
                ],
            },
        ]);
        const second = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        expect(second.status).toBe(200);
        createdRecommendationIds.push(second.body.id);

        // 동점이라 점수만으로는 순서가 안 갈리지만, 새 이슈 102가 타이브레이커로 먼저 나온다
        expect(second.body.items[0].matchScore).toBe(second.body.items[1].matchScore);
        expect(second.body.items[0].issueNumber).toBe(102);

        // isNew로도 신규/기존 이슈를 구분할 수 있어야 한다 (POST 응답 전용 필드)
        const item101 = second.body.items.find((item) => item.issueNumber === 101);
        const item102 = second.body.items.find((item) => item.issueNumber === 102);
        expect(item101.isNew).toBe(false);
        expect(item102.isNew).toBe(true);
        expect(first.body.items[0].isNew).toBe(true); // 최초 추천은 전부 새 이슈

        // GET 재조회 응답에는 isNew가 포함되지 않는다 (생성 시점 스냅샷일 뿐 재조회 때마다 계산하지 않음)
        const refetched = await request(app).get(`/api/recommendations/${second.body.id}`);
        expect(refetched.body.items[0].isNew).toBeUndefined();
    });

    it('규칙 점수가 다르면 안 본 이슈라도 점수 순서를 뒤집지 않는다 (다양화가 매칭 점수 정렬을 깨면 안 됨)', async () => {
        // 1차: 이슈 201(good first issue, 규칙 점수 높음) 하나만 후보로 줘서 "이미 본 이슈"로 만든다
        fetchReposWithIssues.mockResolvedValueOnce([
            {
                fullName: MOCK_REPO_FULL_NAME,
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
                    { number: 201, title: 'seen, high score', url: 'https://github.com/octocat/Hello-World/issues/201', labels: ['good first issue'] },
                ],
            },
        ]);
        const first = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        createdRecommendationIds.push(first.body.id);

        // 2차: 201(이미 본 이슈, 규칙 점수 높음)과 202(라벨 없음 → hard 판정, 규칙 점수 낮음, 새 이슈)를 함께 준다
        fetchReposWithIssues.mockResolvedValueOnce([
            {
                fullName: MOCK_REPO_FULL_NAME,
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
                    { number: 201, title: 'seen, high score', url: 'https://github.com/octocat/Hello-World/issues/201', labels: ['good first issue'] },
                    { number: 202, title: 'new, low score', url: 'https://github.com/octocat/Hello-World/issues/202', labels: [] },
                ],
            },
        ]);
        const second = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        createdRecommendationIds.push(second.body.id);

        // 매칭 점수가 높은 201이 새 이슈(202)보다 항상 먼저 나와야 한다 — 목록이 화면에 "매칭 점수" 순으로 보이기 때문
        expect(second.body.items[0].issueNumber).toBe(201);
        expect(second.body.items[0].matchScore).toBeGreaterThan(second.body.items[1].matchScore);
    });

    it('조건(preferences)을 바꾼 요청은 동일 조건 상한과 무관하게 새로 계산된다', async () => {
        let lastId;
        for (let i = 0; i < 3; i += 1) {
            const res = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
            expect(res.status).toBe(200);
            createdRecommendationIds.push(res.body.id);
            lastId = res.body.id;
        }
        // 같은 조건 4번째는 상한 도달 — 새로 계산하지 않고 캐시된 결과를 그대로 반환
        const cached = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        expect(cached.status).toBe(200);
        expect(cached.body.id).toBe(lastId);

        // 조건을 바꾸면(difficulty: medium) 새로 계산되어야 한다 — 상한은 "동일 조건" 재요청에만 걸린다
        const differentConditions = { ...preferences, difficulty: 'medium' };
        const res = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences: differentConditions });
        expect(res.status).toBe(200);
        expect(res.body.id).not.toBe(lastId);
        createdRecommendationIds.push(res.body.id);
    });
});

describe('GET /api/recommendations — 전체 검색 이력', () => {
    const preferences = { languages: ['JavaScript'], difficulty: 'easy', topics: [] };

    it('여러 세션을 최신순으로 반환한다', async () => {
        const first = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        createdRecommendationIds.push(first.body.id);
        const second = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        createdRecommendationIds.push(second.body.id);

        const res = await request(app).get('/api/recommendations').query({ githubId: TEST_GITHUB_ID });

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
        expect(res.body[0].id).toBe(second.body.id); // 최신(두 번째 요청)이 배열 맨 앞
        expect(res.body[1].id).toBe(first.body.id);
        expect(res.body[0].items.length).toBeGreaterThan(0);
    });

    it('즐겨찾기한 이슈는 isFavorited: true, 나머지는 false로 표시된다', async () => {
        const created = await request(app).post('/api/recommendations').send({ githubId: TEST_GITHUB_ID, preferences });
        createdRecommendationIds.push(created.body.id);
        const favoriteItem = created.body.items[0];

        await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: favoriteItem.repoFullName, issueNumber: favoriteItem.issueNumber });

        const res = await request(app).get('/api/recommendations').query({ githubId: TEST_GITHUB_ID });

        expect(res.status).toBe(200);
        const session = res.body.find((rec) => rec.id === created.body.id);
        const item = session.items.find(
            (i) => i.repoFullName === favoriteItem.repoFullName && i.issueNumber === favoriteItem.issueNumber);
        expect(item.isFavorited).toBe(true);
        const others = session.items.filter((i) => i !== item);
        expect(others.every((i) => i.isFavorited === false)).toBe(true);
    });

    it('githubId 쿼리가 없거나 형식이 잘못되면 400 VALIDATION_ERROR를 반환한다', async () => {
        const missing = await request(app).get('/api/recommendations');
        expect(missing.status).toBe(400);
        expect(missing.body.error.code).toBe('VALIDATION_ERROR');

        const invalid = await request(app).get('/api/recommendations').query({ githubId: '../etc' });
        expect(invalid.status).toBe(400);
        expect(invalid.body.error.code).toBe('VALIDATION_ERROR');
    });
});
