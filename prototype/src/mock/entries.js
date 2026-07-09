// 목 매매 기록. investment_journal 의 entry(fixture) 형태를 재사용하고
// Beacon 예시(삼성전자)를 추가했다. 날짜는 candles.js 생성 범위 내 평일.

export const ENTRIES = [
  {
    id: 'e-samsung-buy',
    symbol: '005930',
    symbolName: '삼성전자',
    entry_type: 'buy',
    entry_date: '2026-07-06',
    price: 80100,
    amount: 10,
    emotion: 'fomo',
    target_price: 88000,
    stop_loss: 76000,
    time_horizon: 'short',
    reasons: ['목표가 도달', 'FOMO/심리', '차트/기술적 반등'],
    condition_text: '단기 지지선 76,000원을 이탈하면 가설이 틀린 것',
    conviction: 82,
    hypothesis:
      '투자 기간: 단기(1~2주)\n주요 근거: 목표가 도달, FOMO/심리, 차트/기술적 반등\n목표가: 88,000\n손절가: 76,000\n가설 무효화: 단기 지지선 76,000원 이탈 시',
    memo: '알림 받자마자 매수. 급등 직후라 조금 성급했던 것 같다.',
    condition_id: 'c-samsung-80k',
    review_id: 'r-samsung-buy',
  },
  {
    id: 'e-nvda-buy',
    symbol: 'NVDA',
    symbolName: 'NVIDIA',
    entry_type: 'buy',
    entry_date: '2026-06-15',
    price: 925,
    amount: 3,
    emotion: 'greed',
    target_price: 1100,
    stop_loss: 880,
    time_horizon: 'short',
    reasons: ['FOMO/심리', '실적 호조', '차트/기술적 반등'],
    condition_text: '뉴스 흐름이 약해지거나 단기 지지선을 이탈하면',
    conviction: 88,
    hypothesis:
      '투자 기간: 단기(1~2주)\n주요 근거: FOMO/심리, 실적 호조\n목표가: 1100\n손절가: 880',
    memo: '',
    condition_id: 'c-nvda-earnings',
    review_id: null,
  },
  {
    id: 'e-samsung-sell',
    symbol: '005930',
    symbolName: '삼성전자',
    entry_type: 'sell',
    entry_date: '2026-06-29',
    price: 83500,
    amount: 5,
    emotion: 'calm',
    target_price: null,
    stop_loss: null,
    time_horizon: 'short',
    reasons: ['목표 수익 달성'],
    condition_text: '목표가 근접, 분할 매도',
    conviction: 70,
    hypothesis: '목표 수익 구간 도달로 절반 익절.',
    memo: '이번엔 계획대로 분할 매도. 지난번보다 나았다.',
    condition_id: null,
    review_id: null,
  },
  {
    id: 'e-samsung-hold',
    symbol: '005930',
    symbolName: '삼성전자',
    entry_type: 'hold',
    entry_date: '2026-05-26',
    price: 77200,
    amount: 0,
    emotion: 'uncertain',
    target_price: null,
    stop_loss: null,
    time_horizon: 'medium',
    reasons: ['방향성 불확실'],
    condition_text: '박스권 상단 돌파 확인 전까지 관망',
    conviction: 44,
    hypothesis: '박스권. 돌파 확인 전 진입 보류.',
    memo: '',
    condition_id: null,
    review_id: null,
  },
]

export function getEntry(id) {
  return ENTRIES.find((e) => e.id === id) ?? null
}

export function getEntriesBySymbol(symbol) {
  return ENTRIES.filter((e) => e.symbol === symbol)
}
