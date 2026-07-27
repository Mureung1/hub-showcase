import assert from 'node:assert/strict';
import test from 'node:test';
import { validateShowcase } from './validate-showcase.mjs';

const validShowcase = {
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
  demoVideoUrl: 'https://www.youtube.com/watch?v=example-video-id',
  thumbnail: 'thumbnail.webp',
  screenshots: ['screenshots/home.webp'],
  agent: {
    summary: '수집 결과를 점검합니다.',
    agentTools: [{ type: 'agent', name: '자료 점검', purpose: '수집 결과를 확인합니다.' }],
    workflows: [{ name: '수집 Workflow', steps: ['수집', '검증', '배포'] }],
  },
  developmentWithAI: 'AI와 함께 자료 수집과 화면 표시를 확인했습니다.',
};

test('올바른 showcase 자료를 허용한다', () => {
  const result = validateShowcase(validShowcase);
  assert.equal(result.ok, true);
});

test('제목이 없어도 다른 내용이 있으면 허용한다', () => {
  const { title, ...withoutTitle } = validShowcase;
  const result = validateShowcase(withoutTitle);
  assert.equal(result.ok, true);
});

test('상위 폴더를 가리키는 이미지 경로를 거부한다', () => {
  const result = validateShowcase({
    ...validShowcase,
    thumbnail: '../private.webp',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /thumbnail/);
});
