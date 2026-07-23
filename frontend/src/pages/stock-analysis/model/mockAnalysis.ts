import type { StockAnalysisResult } from './types'

export const MOCK_STOCK_ANALYSIS: StockAnalysisResult = {
  header: {
    topic: '분석 주제 · 엔비디아 지금 들어가도 돼?',
    stockName: 'NVIDIA',
    stockSymbol: 'NVDA',
    price: '$182.40',
    changeRate: 1.24,
    direction: 'rise',
    updatedAt: '16:00 기준',
    source: '가즈아 리서치',
  },
  judgment: {
    title: '현재 판단',
    paragraphs: [
      '단기적으로 과열된 구간이지만 장기 성장성은 유지되고 있습니다.',
      '신규 진입은 조정 구간을 기다리는 전략이 상대적으로 유리합니다.',
    ],
    positiveFactorCount: 3,
    riskFactorCount: 3,
  },
  reasons: [
    { order: '01', text: '데이터센터 매출 성장' },
    { order: '02', text: '다음 분기 실적 전망 상향' },
    { order: '03', text: 'AI 반도체 시장 지배력' },
  ],
  risks: [
    { order: '01', text: '높은 밸류에이션', description: '이익 대비 주가가 비싼 상태' },
    { order: '02', text: '실적 발표 이후 차익 실현', description: '오른 주식을 팔아 이익을 확정' },
    { order: '03', text: '기술주 전체 조정 가능성' },
  ],
  scenarios: [
    {
      id: 'upside',
      direction: 'rise',
      label: '상승',
      title: '실적 서프라이즈로 상승 흐름 지속',
      description: '추격 매수는 고점 진입 위험이 있어 비중 조절 필요',
    },
    {
      id: 'neutral',
      direction: 'neutral',
      label: '중립',
      title: '발표 전까지 좁은 범위에서 등락',
      description: '조정 구간을 기다리며 관망 가능',
    },
    {
      id: 'downside',
      direction: 'fall',
      label: '하락',
      title: '차익 실현과 기술주 조정이 겹치는 경우',
      description: '분할 접근으로 리스크를 줄이는 전략 유효',
    },
  ],
  easyExplanation:
    '좋은 기업이라고 해서 아무 가격에 사도 되는 것은 아닙니다. 지금은 성장성보다 내가 감당할 수 있는 리스크를 먼저 확인해야 하는 구간입니다.',
  relatedNews: {
    sectionLabel: '시장 소식',
    items: [
      {
        id: 'us-cpi',
        title: '미국 CPI 발표 예정',
        description: '결과에 따라 금리 인하 기대감이 달라질 수 있음',
      },
      {
        id: 'semiconductor-recovery',
        title: '반도체 업황 회복 신호',
        description: '메모리 가격 상승세로 실적 개선 기대',
      },
    ],
  },
  meta: {
    dataDate: '데이터 기준 2026.07.23 16:00',
    source: '출처: 시장 데이터 요약',
    note: '본 분석은 예측이 아닌 참고 정보입니다',
  },
}
