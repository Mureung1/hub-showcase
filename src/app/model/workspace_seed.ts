import type { Insight, InsightCategory } from '@/entities/insight';
import type { SuggestedSituation } from '@/pages/home';
import type { CategoryFilterOption } from '@/shared/ui';

export const CATEGORY_FILTERS: CategoryFilterOption[] = [
  { label: 'All', tone: 'slate', value: 'All' },
  { label: '개발', tone: 'green', value: '개발' },
  { label: '디자인', tone: 'blue', value: '디자인' },
  { label: '팀프로젝트', tone: 'amber', value: '팀프로젝트' },
  { label: '공부', tone: 'slate', value: '공부' },
  { label: '취업', tone: 'coral', value: '취업' },
  { label: '미분류', tone: 'slate', value: '미분류' },
];

export const INITIAL_INSIGHTS: Insight[] = [
  {
    categories: [
      { name: '디자인', tone: 'blue' },
      { name: '공부', tone: 'slate' },
    ],
    domain: 'uxplanet.org',
    id: 1,
    memo: '관심 분야 선택 화면 만들 때 참고하기',
    thumbnail: 'UX',
    title: '모바일 온보딩에서 선택 부담을 줄이는 패턴',
    url: '#',
  },
  {
    categories: [
      { name: '개발', tone: 'green' },
      { name: '공부', tone: 'slate' },
    ],
    domain: 'supabase.com',
    id: 2,
    memo: '사용자별 보관함 분리 확인 체크리스트',
    thumbnail: 'DB',
    title: 'Supabase RLS 정책을 프론트에서 검증하는 방법',
    url: '#',
  },
  {
    categories: [
      { name: '팀프로젝트', tone: 'amber' },
      { name: '공부', tone: 'slate' },
    ],
    domain: 'brunch.co.kr',
    id: 3,
    memo: '데모데이 발표 흐름 정리할 때 다시 보기',
    thumbnail: 'PM',
    title: '팀 프로젝트 앱 기획서 구조와 데모 시나리오',
    url: '#',
  },
  {
    categories: [{ name: '디자인', tone: 'blue' }],
    domain: 'refero.design',
    id: 4,
    memo: '인사이트 카드의 원문 열기 위치 결정',
    thumbnail: 'UI',
    title: '카드 UI에서 메타 정보와 CTA를 분리하는 법',
    url: '#',
  },
  {
    categories: [{ name: '개발', tone: 'green' }],
    domain: 'fusejs.io',
    id: 5,
    thumbnail: 'JS',
    title: 'Fuse.js 검색 가중치 설정 예시',
    url: '#',
  },
  {
    categories: [{ name: '취업', tone: 'coral' }],
    domain: 'medium.com',
    id: 6,
    memo: '취업 준비 자료로 분리해두기',
    thumbnail: 'CV',
    title: '포트폴리오 프로젝트 회고 작성 가이드',
    url: '#',
  },
];

export const SUGGESTED_CATEGORIES: InsightCategory[] = [
  { name: '개발', tone: 'green' },
  { name: '디자인', tone: 'blue' },
  { name: '공부', tone: 'amber' },
  { name: '팀프로젝트', tone: 'slate' },
];

export const SUGGESTED_SITUATIONS: SuggestedSituation[] = [
  { label: '팀 프로젝트', query: '팀 프로젝트 앱 디자인 참고' },
  { label: '개발 공부', query: '개발 공부 정리' },
  { label: 'UI 레퍼런스', query: 'UI 레퍼런스 찾기' },
  { label: '포트폴리오', query: '취업 포트폴리오 준비' },
  { label: '과제 자료', query: '과제 자료 정리' },
  { label: '온보딩 화면', query: '온보딩 화면 만들기' },
];
