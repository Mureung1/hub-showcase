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
  { label: '과제 참고자료 다시 찾기', query: '과제 참고자료 다시 찾기' },
  { label: '프로젝트에 쓸 자료 꺼내기', query: '프로젝트에 쓸 자료 꺼내기' },
  { label: '공모전 아이디어 발전시키기', query: '공모전 아이디어 발전시키기' },
  {
    label: '여행·취미 계획 다시 이어가기',
    query: '여행 취미 계획 다시 이어가기',
  },
  { label: '디자인·개발 레퍼런스 찾기', query: '디자인 개발 레퍼런스 찾기' },
  { label: '저장해둔 영상 골라보기', query: '저장한 영상 골라보기' },
];
