import { describe, expect, it } from 'vitest';

import { filterInsights, type Insight } from './insight';

const insights: Insight[] = [
  {
    categories: [{ name: '디자인', tone: 'blue' }],
    domain: 'example.com',
    id: 1,
    memo: '팀 프로젝트 첫 화면에 참고하기',
    thumbnail: 'UI',
    title: '선택 부담을 줄이는 디자인',
    url: '#',
  },
  {
    categories: [{ name: '개발', tone: 'green' }],
    domain: 'example.dev',
    id: 2,
    thumbnail: 'DEV',
    title: '팀 프로젝트 개발 가이드',
    url: '#',
  },
  {
    categories: [],
    domain: 'uncategorized.example',
    id: 3,
    thumbnail: 'NEW',
    title: '아직 분류하지 않은 링크',
    url: '#',
  },
];

describe('filterInsights', () => {
  it('matches a category and every contained query token', () => {
    expect(filterInsights(insights, '디자인', '팀 프로젝트')).toEqual([
      insights[0],
    ]);
  });

  it('returns uncategorized insights in input order for an empty query', () => {
    expect(filterInsights(insights, '미분류', '')).toEqual([insights[2]]);
  });
});
