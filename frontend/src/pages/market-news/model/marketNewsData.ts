import type { MarketNewsItem } from './types'

export const MARKET_NEWS_ITEMS: MarketNewsItem[] = [
  {
    id: 'us-cpi',
    title: '미국 CPI 발표 예정',
    impact: 'high',
    tags: ['기술주', '성장주', '반도체'],
    description: '물가 지표 결과에 따라 금리 인하 기대감이 달라질 수 있습니다.',
    easyInterpretation:
      '물가가 낮게 나오면 금리를 빨리 내릴 수 있다는 기대가 커져 성장주에 우호적일 수 있습니다.',
  },
  {
    id: 'fomc-minutes',
    title: '미 연준 FOMC 의사록 공개',
    impact: 'medium',
    tags: ['금융주', '성장주'],
    description: '금리 인하 시점에 대한 연준 위원들의 시각을 확인할 수 있습니다.',
    easyInterpretation:
      '의사록에서 신중한 태도가 확인되면 금리 인하 기대가 약해지고 시장이 흔들릴 수 있습니다.',
  },
  {
    id: 'semiconductor-recovery',
    title: '반도체 업황 회복 신호',
    impact: 'medium',
    tags: ['반도체', 'IT부품'],
    description: '메모리 가격 상승세가 이어지며 실적 개선 기대감이 커지고 있습니다.',
    easyInterpretation:
      '업황이 좋아지면 기업 실적도 개선될 수 있지만, 기대가 주가에 이미 반영됐는지도 확인해야 합니다.',
  },
  {
    id: 'oil-price',
    title: '국제 유가 상승',
    impact: 'low',
    tags: ['정유', '항공'],
    description: '산유국 감산 연장 논의로 유가가 완만하게 오르고 있습니다.',
    easyInterpretation:
      '유가 상승은 정유주에는 긍정적일 수 있지만, 물가 부담이 커지면 시장 전체에는 부담이 될 수 있습니다.',
  },
]
