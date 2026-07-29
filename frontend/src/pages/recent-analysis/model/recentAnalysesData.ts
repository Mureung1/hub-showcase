import type { FilterChipOption } from '@/shared/ui/FilterChipRow'

import type { AnalysisCategoryFilter, RecentAnalysisItem } from './types'

export const CATEGORY_FILTERS: FilterChipOption<AnalysisCategoryFilter>[] = [
  { id: 'all', label: '전체' },
  { id: 'market', label: '시장 시황' },
  { id: 'stock', label: '종목 분석' },
  { id: 'risk', label: '리스크 점검' },
  { id: 'term', label: '용어 질문' },
]

export const RECENT_ANALYSES: RecentAnalysisItem[] = [
  {
    id: 'nvda-entry',
    category: 'stock',
    title: '엔비디아 지금 들어가도 돼?',
    description: '장기 성장성은 강하지만 단기 고점 진입 리스크가 있음',
    tags: ['NVDA', 'AI반도체', '고평가'],
    relativeTime: '오늘',
  },
  {
    id: 'kospi-drop',
    category: 'market',
    title: '오늘 코스피 하락 이유',
    description: '미국 물가 지표 경계감과 반도체 차익 실현이 겹치며 지수가 눌림',
    tags: ['코스피', '물가지표'],
    relativeTime: '오늘',
  },
  {
    id: 'samsung-risk',
    category: 'risk',
    title: '삼성전자 진입 리스크 점검',
    description: '실적 회복 기대는 유효하나 단기 급등 구간이라 분할 접근이 안전',
    tags: ['삼성전자', '반도체'],
    relativeTime: '어제',
  },
  {
    id: 'rate-cut-term',
    category: 'term',
    title: '금리 인하 기대감이 뭔데?',
    description: '금리가 내려갈 것이라는 기대가 주가에 미리 반영되는 현상',
    tags: ['금리', '기초개념'],
    relativeTime: '2일 전',
  },
  {
    id: 'tsla-drop',
    category: 'stock',
    title: '테슬라 하락 원인 분석',
    description: '수요 둔화 우려와 경쟁 심화가 겹치며 투자 심리가 약해짐',
    tags: ['TSLA', '전기차'],
    relativeTime: '3일 전',
  },
]
