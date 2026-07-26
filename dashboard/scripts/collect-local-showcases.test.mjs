import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { collectLocalShowcases, safeBranchName } from './collect-local-showcases.mjs';

const showcase = {
  schemaVersion: 1,
  title: 'GitHub Pages 수집 시험',
  summary: '원격 브랜치 자료를 읽어 카드에 표시합니다.',
  problem: '브랜치별 프로젝트를 한 화면에서 확인하기 어렵습니다.',
  targetUsers: ['캠프 방문자'],
  features: ['브랜치 자료 수집'],
  featureTags: ['수집'],
  techStack: ['React'],
  techHighlights: ['정적 자료 생성'],
  githubUser: 'dashboard-test',
  demoUrl: '',
  demoVideoUrl: 'https://drive.google.com/file/d/example/view',
  thumbnail: 'thumbnail.webp',
  screenshots: ['screenshots/home.webp'],
  agent: {
    summary: '수집 결과를 점검합니다.',
    agentTools: [{ type: 'agent', name: '자료 점검', purpose: '수집 결과를 확인합니다.' }],
    workflows: [{ name: '수집 Workflow', steps: ['수집', '검증', '배포'] }],
  },
  developmentWithAI: 'AI와 함께 자료 수집과 화면 표시를 확인했습니다.',
};

test('한글이 포함된 학생 브랜치 이름을 허용한다', () => {
  assert.equal(safeBranchName('N001_강민구'), 'N001_강민구');
});

test('유효한 브랜치의 JSON과 이미지만 공개 자료로 만든다', async (context) => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'showcase-collector-'));
  context.after(() => rm(outputDir, { recursive: true, force: true }));

  const files = new Map([
    ['dashboard-showcase-test:showcase/showcase.json', Buffer.from(JSON.stringify(showcase))],
    ['dashboard-showcase-test:showcase/thumbnail.webp', Buffer.from('thumbnail')],
    ['dashboard-showcase-test:showcase/screenshots/home.webp', Buffer.from('screenshot')],
  ]);

  const result = await collectLocalShowcases({
    branches: ['main', 'dashboard-showcase-test'],
    outputDir,
    readBranchFile: async (branch, filePath) => files.get(`${branch}:${filePath}`) ?? null,
  });

  assert.equal(result.projects.length, 16);
  assert.equal(result.realProjectCount, 1);
  assert.equal(result.dummyProjectCount, 15);
  assert.equal(result.projects[0].sourceBranch, 'dashboard-showcase-test');
  assert.equal(result.projects[0].thumbnailUrl, './showcases/dashboard-showcase-test/thumbnail.webp');
  assert.equal(result.projects[1].isDummy, true);
  assert.equal(result.projects[1].thumbnailUrl, result.projects[0].thumbnailUrl);
  assert.equal(result.skippedMissing, 1);

  const output = JSON.parse(await readFile(path.join(outputDir, 'data/showcases.json'), 'utf8'));
  assert.equal(output.projectCount, 16);
  assert.equal(output.projects[0].title, 'GitHub Pages 수집 시험');

  const thumbnail = await readFile(
    path.join(outputDir, 'showcases/dashboard-showcase-test/thumbnail.webp'),
    'utf8',
  );
  assert.equal(thumbnail, 'thumbnail');
});

test('잘못된 showcase 자료가 있어도 더미 자료로 계속 만든다', async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), 'showcase-invalid-'));

  try {
    const result = await collectLocalShowcases({
      branches: ['broken-project'],
      outputDir,
      readBranchFile: async () => Buffer.from('{"title":'),
    });

    assert.equal(result.realProjectCount, 0);
    assert.equal(result.projectCount, 16);
    assert.equal(result.dummyProjectCount, 16);
    assert.equal(result.skippedInvalid, 1);
    assert.equal(result.projects[0].thumbnailUrl, './dummy-thumbnail.svg');
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
});
