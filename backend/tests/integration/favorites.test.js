import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';

// 즐겨찾기는 GitHub/LLM을 전혀 안 부르고 DB(Supabase)만 다루므로 mock이 필요 없다 (docs/testing.md)
const { default: app } = await import('../../app.js');
const { default: prisma } = await import('../../src/config/prisma.js');

const TEST_GITHUB_ID = 'vitest-test-user';
const REPO_FULL_NAME = 'octocat/Hello-World';
const ISSUE_NUMBER = 1;

beforeEach(async () => {
    await prisma.favorite.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
});

afterAll(async () => {
    await prisma.favorite.deleteMany({ where: { githubId: TEST_GITHUB_ID } });
    await prisma.$disconnect();
});

describe('POST /api/favorites', () => {
    it('즐겨찾기를 추가하고 favorited: true를 반환한다', async () => {
        const res = await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.favorited).toBe(true);

        const saved = await prisma.favorite.findUnique({
            where: {
                githubId_repoFullName_issueNumber: {
                    githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER,
                },
            },
        });
        expect(saved).not.toBeNull();
    });

    it('이미 즐겨찾기된 항목을 다시 추가해도 에러 없이 200을 반환한다(idempotent)', async () => {
        await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        const res = await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.favorited).toBe(true);

        const rows = await prisma.favorite.findMany({ where: { githubId: TEST_GITHUB_ID } });
        expect(rows.length).toBe(1);
    });

    it('githubId 형식이 잘못되면 400 VALIDATION_ERROR를 반환한다', async () => {
        const res = await request(app)
            .post('/api/favorites')
            .send({ githubId: '../etc', repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('repoFullName이 owner/repo 형식이 아니면 400을 반환한다', async () => {
        const res = await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: 'not-a-repo', issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('issueNumber가 정수가 아니면 400을 반환한다', async () => {
        const res = await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: 'abc' });

        expect(res.status).toBe(400);
        expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
});

describe('DELETE /api/favorites', () => {
    it('즐겨찾기를 삭제하고 favorited: false를 반환한다', async () => {
        await request(app)
            .post('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        const res = await request(app)
            .delete('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.favorited).toBe(false);

        const rows = await prisma.favorite.findMany({ where: { githubId: TEST_GITHUB_ID } });
        expect(rows.length).toBe(0);
    });

    it('즐겨찾기돼 있지 않은 항목을 삭제해도 에러 없이 200을 반환한다(idempotent)', async () => {
        const res = await request(app)
            .delete('/api/favorites')
            .send({ githubId: TEST_GITHUB_ID, repoFullName: REPO_FULL_NAME, issueNumber: ISSUE_NUMBER });

        expect(res.status).toBe(200);
        expect(res.body.favorited).toBe(false);
    });
});
