// 목 감시 조건. Discord 자연어 입력 → 파싱 → 저장된 형태.
export const CONDITIONS = [
  {
    id: 'c-samsung-80k',
    symbol: '005930',
    symbolName: '삼성전자',
    raw: '삼성전자가 8만 원이 되면 알려줘',
    rule: '현재가 ≥ 80,000원',
    status: 'active',
    created_at: '2026-07-01',
    last_fired: '2026-07-06',
  },
  {
    id: 'c-nvda-earnings',
    symbol: 'NVDA',
    symbolName: 'NVIDIA',
    raw: '엔비디아 5일선이 20일선 위로 올라오면 알려줘',
    rule: 'SMA(5) 상향 돌파 SMA(20)',
    status: 'active',
    created_at: '2026-06-10',
    last_fired: '2026-06-15',
  },
  {
    id: 'c-tsla-drop',
    symbol: 'TSLA',
    symbolName: 'Tesla',
    raw: '테슬라 170달러 밑으로 떨어지면 알려줘',
    rule: '현재가 ≤ $170',
    status: 'paused',
    created_at: '2026-06-20',
    last_fired: null,
  },
]

export function getCondition(id) {
  if (!id) return null
  return CONDITIONS.find((c) => c.id === id) ?? null
}
