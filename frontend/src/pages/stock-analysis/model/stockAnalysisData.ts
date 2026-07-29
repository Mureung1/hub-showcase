import type { StockAnalysisResult } from './types'

export const STOCK_ANALYSES: Record<string, StockAnalysisResult> = {
  NVDA: {
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
      positiveFactorCount: 4,
      riskFactorCount: 3,
    },
    reasons: [
      { order: '01', text: '데이터센터 매출 성장' },
      { order: '02', text: '다음 분기 실적 전망 상향' },
      { order: '03', text: 'AI 반도체 시장 지배력' },
      { order: '04', text: '클라우드 기업들의 설비 투자 지속' },
    ],
    risks: [
      { order: '01', text: '높은 밸류에이션', description: '이익 대비 주가가 비싼 상태' },
      {
        order: '02',
        text: '실적 발표 이후 차익 실현',
        description: '오른 주식을 팔아 이익을 확정',
      },
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
          id: 'ai-capex',
          title: '빅테크 AI 설비투자 확대',
          description: 'GPU 수요가 이어질 수 있다는 기대를 키웁니다.',
        },
        {
          id: 'semiconductor-recovery',
          title: '반도체 업황 회복 신호',
          description: '메모리와 AI 반도체가 같이 주목받고 있습니다.',
        },
        {
          id: 'us-cpi',
          title: '미국 CPI 발표 예정',
          description: '금리 기대 변화가 성장주 밸류에이션에 영향을 줄 수 있습니다.',
        },
      ],
    },
    meta: {
      dataDate: '데이터 기준 2026.07.29 16:00',
      source: '출처: 시장 데이터',
      note: '본 분석은 예측이 아닌 참고 정보입니다',
    },
  },
  '005930': {
    header: {
      topic: '분석 주제 · 삼성전자 진입 타이밍 점검',
      stockName: '삼성전자',
      stockSymbol: '005930',
      price: '78,200원',
      changeRate: 1.56,
      direction: 'rise',
      updatedAt: '15:30 기준',
      source: '가즈아 리서치',
    },
    judgment: {
      title: '현재 판단',
      paragraphs: [
        '메모리 업황 회복 기대가 주가를 지지하고 있습니다.',
        '다만 실적 기대가 빠르게 반영된 만큼 발표 전 변동성은 커질 수 있습니다.',
      ],
      positiveFactorCount: 4,
      riskFactorCount: 3,
    },
    reasons: [
      { order: '01', text: 'D램 가격 반등' },
      { order: '02', text: 'HBM 공급 확대 기대' },
      { order: '03', text: '원화 약세에 따른 수출주 우호 환경' },
      { order: '04', text: '외국인 순매수 재개' },
    ],
    risks: [
      { order: '01', text: '실적 눈높이 부담' },
      { order: '02', text: '반도체 사이클 회복 속도 둔화 가능성' },
      { order: '03', text: '지수 조정 시 대형주 동반 약세' },
    ],
    scenarios: [
      {
        id: 'upside',
        direction: 'rise',
        label: '상승',
        title: '메모리 가격 상승과 실적 개선 기대가 이어지는 경우',
        description: '분할 매수 관점은 가능하지만 공시 전후 변동성 확인 필요',
      },
      {
        id: 'neutral',
        direction: 'neutral',
        label: '중립',
        title: '기대와 실적 확인 사이에서 박스권 등락',
        description: '급하게 따라가기보다 눌림 구간 확인이 유리',
      },
      {
        id: 'downside',
        direction: 'fall',
        label: '하락',
        title: '실적 발표가 기대를 충족하지 못하는 경우',
        description: '단기 매물 출회 가능성이 있어 손절 기준이 필요',
      },
    ],
    easyExplanation:
      '삼성전자는 업황 회복을 사는 종목입니다. 지금은 좋은 뉴스보다 실제 실적이 기대를 따라오는지를 확인하는 구간으로 보는 편이 안전합니다.',
    relatedNews: {
      sectionLabel: '시장 소식',
      items: [
        {
          id: 'samsung-disclosure',
          title: '삼성전자 잠정실적 공시 예정',
          description: '매출과 영업이익 개선 폭이 핵심입니다.',
        },
        {
          id: 'memory-price',
          title: '메모리 가격 반등 지속',
          description: '업황 회복 기대를 뒷받침합니다.',
        },
        {
          id: 'krw-weakness',
          title: '원화 약세 흐름',
          description: '수출 대형주에는 단기 우호 요인이 될 수 있습니다.',
        },
      ],
    },
    meta: {
      dataDate: '데이터 기준 2026.07.29 15:30',
      source: '출처: 시장 데이터',
      note: '본 분석은 예측이 아닌 참고 정보입니다',
    },
  },
  BTC: {
    header: {
      topic: '분석 주제 · 비트코인 반등 따라가도 될까?',
      stockName: 'Bitcoin',
      stockSymbol: 'BTC',
      price: '$118,600',
      changeRate: -0.8,
      direction: 'fall',
      updatedAt: '실시간',
      source: '가즈아 리서치',
    },
    judgment: {
      title: '현재 판단',
      paragraphs: [
        '위험자산 선호가 회복되면 반등 탄력은 크지만 변동성도 같이 커집니다.',
        '단기 매수는 비중을 낮추고 기준가를 명확히 두는 접근이 적합합니다.',
      ],
      positiveFactorCount: 3,
      riskFactorCount: 4,
    },
    reasons: [
      { order: '01', text: '달러 약세에 따른 위험자산 선호' },
      { order: '02', text: '기관 자금 유입 기대' },
      { order: '03', text: '기술주 반등과 투자심리 개선' },
    ],
    risks: [
      { order: '01', text: '큰 일중 변동성' },
      { order: '02', text: '레버리지 청산 리스크' },
      { order: '03', text: '규제 뉴스 민감도' },
      { order: '04', text: '달러 반등 시 압박' },
    ],
    scenarios: [
      {
        id: 'upside',
        direction: 'rise',
        label: '상승',
        title: '위험자산 선호가 이어지며 전고점 재도전',
        description: '추격보다는 돌파 후 지지 확인이 중요',
      },
      {
        id: 'neutral',
        direction: 'neutral',
        label: '중립',
        title: '큰 방향 없이 변동성 장세',
        description: '분할 접근과 짧은 손절 기준이 필요',
      },
      {
        id: 'downside',
        direction: 'fall',
        label: '하락',
        title: '달러 반등과 레버리지 청산이 겹치는 경우',
        description: '현금 비중을 유지하며 재진입 구간을 기다리는 편이 안전',
      },
    ],
    easyExplanation:
      '비트코인은 방향을 맞히는 것보다 변동성을 버틸 수 있는지가 더 중요합니다. 분석에서는 작은 비중, 분할 접근, 명확한 손절 기준을 강조합니다.',
    relatedNews: {
      sectionLabel: '시장 소식',
      items: [
        {
          id: 'bitcoin-risk-on',
          title: '위험자산 선호 회복에 비트코인 반등',
          description: '기술주와 동반 반등하는 흐름입니다.',
        },
        {
          id: 'dollar-index',
          title: '달러 인덱스 하락',
          description: '가상자산에는 우호적인 재료로 해석됩니다.',
        },
        {
          id: 'crypto-volatility',
          title: '파생시장 변동성 확대',
          description: '청산 리스크를 같이 확인해야 합니다.',
        },
      ],
    },
    meta: {
      dataDate: '데이터 기준 2026.07.29 실시간',
      source: '출처: 시장 데이터',
      note: '본 분석은 예측이 아닌 참고 정보입니다',
    },
  },
  TSLA: {
    header: {
      topic: '분석 주제 · 테슬라 모멘텀 점검',
      stockName: 'Tesla',
      stockSymbol: 'TSLA',
      price: '$284.10',
      changeRate: 0.42,
      direction: 'rise',
      updatedAt: '16:00 기준',
      source: '가즈아 리서치',
    },
    judgment: {
      title: '현재 판단',
      paragraphs: [
        '성장 기대는 살아 있지만 실적과 마진 확인이 필요합니다.',
        '이벤트 전후 변동성이 큰 종목이라 추격 매수 부담이 있습니다.',
      ],
      positiveFactorCount: 3,
      riskFactorCount: 3,
    },
    reasons: [
      { order: '01', text: '자율주행 기대감' },
      { order: '02', text: '신차 출시 기대' },
      { order: '03', text: '위험자산 선호 회복' },
    ],
    risks: [
      { order: '01', text: '마진 둔화 우려' },
      { order: '02', text: '높은 변동성' },
      { order: '03', text: '경쟁 심화' },
    ],
    scenarios: [
      {
        id: 'upside',
        direction: 'rise',
        label: '상승',
        title: '신차와 자율주행 기대가 다시 부각',
        description: '거래량 동반 상승 여부 확인 필요',
      },
      {
        id: 'neutral',
        direction: 'neutral',
        label: '중립',
        title: '기대와 실적 우려가 맞서는 구간',
        description: '이벤트 확인 전까지 관망 가능',
      },
      {
        id: 'downside',
        direction: 'fall',
        label: '하락',
        title: '마진 우려가 커지는 경우',
        description: '손실 제한 기준을 먼저 정하는 편이 안전',
      },
    ],
    easyExplanation:
      '테슬라는 기대감이 빠르게 가격에 반영되는 종목입니다. 좋은 뉴스가 나와도 주가가 먼저 오른 상태인지 확인해야 합니다.',
    relatedNews: {
      sectionLabel: '시장 소식',
      items: [
        { id: 'ev-demand', title: '전기차 수요 둔화 우려', description: '마진 압박 요인입니다.' },
        {
          id: 'autonomy-day',
          title: '자율주행 업데이트 기대',
          description: '모멘텀 재료로 작동할 수 있습니다.',
        },
      ],
    },
    meta: {
      dataDate: '데이터 기준 2026.07.29 16:00',
      source: '출처: 시장 데이터',
      note: '본 분석은 예측이 아닌 참고 정보입니다',
    },
  },
  AAPL: {
    header: {
      topic: '분석 주제 · 애플 AI 기대감은 주가에 충분히 반영됐을까?',
      stockName: 'Apple',
      stockSymbol: 'AAPL',
      price: '$231.80',
      changeRate: 0.89,
      direction: 'rise',
      updatedAt: '16:00 기준',
      source: '가즈아 리서치',
    },
    judgment: {
      title: '현재 판단',
      paragraphs: [
        '온디바이스 AI 기대가 투자심리를 개선시키고 있습니다.',
        '다만 아이폰 교체 수요가 실제 매출로 확인되기 전까지는 기대와 실적 사이의 간격을 확인해야 합니다.',
      ],
      positiveFactorCount: 3,
      riskFactorCount: 3,
    },
    reasons: [
      { order: '01', text: '온디바이스 AI 기능 확산 기대' },
      { order: '02', text: '서비스 매출의 안정적인 성장' },
      { order: '03', text: '강한 주주환원 정책' },
    ],
    risks: [
      { order: '01', text: '아이폰 교체 수요 둔화' },
      { order: '02', text: '중국 매출 회복 지연' },
      { order: '03', text: 'AI 기대 선반영 부담' },
    ],
    scenarios: [
      {
        id: 'upside',
        direction: 'rise',
        label: '상승',
        title: 'AI 기능이 교체 수요로 연결되는 경우',
        description: '실적 시즌까지 우호적인 흐름이 이어질 수 있습니다.',
      },
      {
        id: 'neutral',
        direction: 'neutral',
        label: '중립',
        title: '기대감은 유지되지만 매출 확인을 기다리는 경우',
        description: '급등보다는 완만한 박스권 흐름이 나올 수 있습니다.',
      },
      {
        id: 'downside',
        direction: 'fall',
        label: '하락',
        title: '중국 수요와 AI 반응이 기대보다 약한 경우',
        description: '대형 기술주 전반의 밸류에이션 부담이 같이 커질 수 있습니다.',
      },
    ],
    easyExplanation:
      '애플은 안정적인 기업이지만 새 성장동력에 대한 기대가 주가를 움직이는 구간입니다. 기대가 실제 판매 증가로 이어지는지가 핵심입니다.',
    relatedNews: {
      sectionLabel: '시장 소식',
      items: [
        {
          id: 'apple-ai-device',
          title: '애플, 온디바이스 AI 기대감으로 반등',
          description: '신제품 교체 수요 기대가 커지고 있습니다.',
        },
        {
          id: 'consumer-demand',
          title: '미국 소비 지표 발표 예정',
          description: '프리미엄 기기 수요를 해석하는 단서가 될 수 있습니다.',
        },
      ],
    },
    meta: {
      dataDate: '데이터 기준 2026.07.29 16:00',
      source: '출처: 시장 데이터',
      note: '본 분석은 예측이 아닌 참고 정보입니다',
    },
  },
}

export const DEFAULT_STOCK_ANALYSIS = STOCK_ANALYSES.NVDA

export function getStockAnalysis(symbol?: string): StockAnalysisResult {
  if (!symbol) return DEFAULT_STOCK_ANALYSIS

  return STOCK_ANALYSES[symbol.toUpperCase()] ?? DEFAULT_STOCK_ANALYSIS
}
