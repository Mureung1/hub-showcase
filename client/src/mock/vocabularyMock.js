// docs/api-spec.md 4번(GET /api/vocabulary) 응답 데이터 구조와 동일한 모양의
// 더미 데이터. 백엔드 연동 전 화면을 먼저 완성하기 위한 용도.
export const vocabularyMock = [
  {
    term: "bear market",
    definition: "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
    articleTitle: "Tech Stocks Slide as Investors Brace for Bear Market",
    articleUrl: "https://www.bloomberg.com/news/articles/2026-07-12/tech-stocks-bear-market",
    addedAt: "2026-07-12T10:00:00+09:00",
  },
  {
    term: "sell-off",
    definition: "투자자들이 한꺼번에 주식을 팔아치우는 현상입니다.",
    articleTitle: "Tech Stocks Slide as Investors Brace for Bear Market",
    articleUrl: "https://www.bloomberg.com/news/articles/2026-07-12/tech-stocks-bear-market",
    addedAt: "2026-07-12T10:00:05+09:00",
  },
  {
    term: "guidance",
    definition: "기업이 향후 실적에 대해 스스로 제시하는 전망치입니다.",
    articleTitle: "Fed Signals Rate Path as Inflation Guidance Shifts",
    articleUrl: "https://www.nytimes.com/2026/07/12/business/fed-rate-path-guidance.html",
    addedAt: "2026-07-13T09:15:00+09:00",
  },
  {
    term: "rate path",
    definition: "중앙은행이 향후 기준금리를 어떤 방향과 속도로 움직일지의 흐름을 뜻합니다.",
    articleTitle: "Fed Signals Rate Path as Inflation Guidance Shifts",
    articleUrl: "https://www.nytimes.com/2026/07/12/business/fed-rate-path-guidance.html",
    addedAt: "2026-07-13T09:15:05+09:00",
  },
  {
    term: "ticker",
    definition: "특정 종목을 표시하는 알파벳 코드(종목 코드)입니다.",
    articleTitle: "EV Maker's Ticker Jumps 8% on Strong Delivery Numbers",
    articleUrl: "https://www.reuters.com/business/autos/ev-maker-ticker-jumps-2026-07-12",
    addedAt: "2026-07-13T14:30:00+09:00",
  },
  {
    term: "delivery numbers",
    definition: "자동차 업체가 실제로 고객에게 인도한 차량 대수를 뜻하며, 실적의 핵심 지표로 쓰입니다.",
    articleTitle: "EV Maker's Ticker Jumps 8% on Strong Delivery Numbers",
    articleUrl: "https://www.reuters.com/business/autos/ev-maker-ticker-jumps-2026-07-12",
    addedAt: "2026-07-13T14:30:10+09:00",
  },
]
