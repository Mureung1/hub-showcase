import type { SuggestedSituation } from '@/pages/home';
import type { CategoryFilterOption } from '@/shared/ui';

export const CATEGORY_FILTERS: CategoryFilterOption[] = [
  { label: '전체', tone: 'slate', value: 'All' },
  { label: '개발', tone: 'green', value: '개발' },
  { label: '디자인', tone: 'blue', value: '디자인' },
  { label: '팀프로젝트', tone: 'amber', value: '팀프로젝트' },
  { label: '공부', tone: 'slate', value: '공부' },
  { label: '취업', tone: 'coral', value: '취업' },
  { label: '미분류', tone: 'slate', value: '미분류' },
];

export const SUGGESTED_SITUATIONS: SuggestedSituation[] = [
  { label: '팀 프로젝트', query: '팀 프로젝트 앱 디자인 참고' },
  { label: '개발 공부', query: '개발 공부 정리' },
  { label: 'UI 레퍼런스', query: 'UI 레퍼런스 찾기' },
  { label: '포트폴리오', query: '취업 포트폴리오 준비' },
  { label: '과제 자료', query: '과제 자료 정리' },
  { label: '온보딩 화면', query: '온보딩 화면 만들기' },
];
