// 목 AI 복기 결과. Beacon 복기 스키마 (mockups/ai-review.html 형태):
// verdict + 타이밍/감정/반복실수 3셀 + 과거기록 인용(cited_trade_ids = 핵심 차별점)

export const REVIEWS = {
  'r-samsung-buy': {
    id: 'r-samsung-buy',
    entry_id: 'e-samsung-buy',
    verdict:
      '급등 직후 추격매수 패턴이 세 번째 반복되고 있어요. 이번에도 목표가 도달 5분 만에 진입했습니다.',
    cells: [
      {
        icon: '⏱️',
        label: '타이밍',
        desc: '단기 급등 구간에서 진입. 직전 3거래일 +6.2%로 과열 신호.',
      },
      {
        icon: '🌡️',
        label: '감정',
        desc: '알림 후 평균보다 4배 빠르게 기록 — 조급함이 반영된 진입.',
      },
      {
        icon: '🔁',
        label: '반복 실수',
        desc: '"목표가=매수" 즉시 실행이 과거와 동일. 분할매수 미적용.',
      },
    ],
    cited: [
      {
        date: '2026-05-12',
        title: 'SK하이닉스 매수',
        pattern: '같은 "급등 직후 추격" 패턴',
        note: '당시 복기: "성급했다. 이틀 뒤 -4%."',
      },
      {
        date: '2026-03-20',
        title: '삼성전자 매수',
        pattern: '목표가 도달 즉시 진입',
        note: '당시 복기: "기다렸으면 더 낮게 살 수 있었다."',
      },
    ],
  },
}

export function getReview(id) {
  if (!id) return null
  return REVIEWS[id] ?? null
}
