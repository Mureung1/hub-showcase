# API 스펙 (`docs/api-spec.md`)

> 실제 구현 기준으로 작성됨. 아래 5개 엔드포인트는 모두 `server/src/routes/`,
> `server/src/services/`의 실제 코드를 기준으로 문서화했다(2주차 스캐폴드
> 기준 — `analyzeArticle`은 아직 더미 응답, `parseArticle`은 실제
> fetch+cheerio 스크래핑). 프론트엔드-백엔드 통신은 모두 `{ success: boolean,
> data 또는 error }` 형식으로 통일한다.

## 1. GET /api/dashboard — 오늘의 핵심 외신 3개

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "fed-guidance",
        "source": "The New York Times",
        "sourceInitial": "NYT",
        "headline": "Fed Signals Rate Path as Inflation Guidance Shifts",
        "translation": "연준, 인플레이션 가이던스 변화에 따라 금리 방향 시사",
        "tickers": ["$SPX", "$TLT"],
        "url": "https://www.nytimes.com/2026/07/12/business/fed-rate-path-guidance.html"
      }
    ]
  }
}
```

현재 `server/src/routes/dashboard.js`의 고정 픽스처 3건을 그대로 반환한다
(실제 외신 수집·선별 로직은 아직 없음).

## 2. POST /api/article/parse — 외신 URL 파싱

```json
// 요청
{ "url": "https://finance.yahoo.com/news/..." }

// 응답 (항상 success: true)
{
  "success": true,
  "data": {
    "title": "Tech Stocks Slide as Investors Brace for Bear Market",
    "source": "finance.yahoo.com",
    "sourceInitial": "FI",
    "publishedAt": "2026-07-12T00:00:00+09:00",
    "paragraphs": [
      "Shares of major technology companies fell sharply on Friday...",
      "..."
    ],
    "url": "https://finance.yahoo.com/news/..."
  }
}
```

`server/src/services/articleParser.js`의 `parseArticle`은 스크래핑에
성공하면 실제 파싱 결과(`title`/`source`/`sourceInitial`은 URL 호스트명
기반/`publishedAt`은 파싱 시각/`paragraphs`)를 반환하고, 403·404·페이지
구조 불일치 등으로 실패하면 **라우트로 에러를 던지지 않고 서비스 내부에서
조용히** 하드코딩된 더미 기사(`FALLBACK_ARTICLE`, `prototype/02_reader.html`과
동일한 지문)로 대체해 반환한다. 즉 이 엔드포인트는 스크래핑 성공/실패
여부와 무관하게 **항상 `success: true`**이며, 실패 여부를 프론트엔드가
구분할 방법은 현재 없다. `url` 필드가 누락된 요청일 때만 라우트 자체에서
`500 { success: false, error: "url is required" }`를 반환한다.

## 3. POST /api/article/analyze — 툴팁/요약/인사이트 생성

```json
// 요청
{ "paragraphs": ["Shares of major technology companies fell sharply...", "..."] }

// 응답
{
  "success": true,
  "data": {
    "terms": [
      {
        "term": "bear market",
        "metaphor": "곰이 앞발로 내려찍는 모습에서 유래했어요.",
        "definition": "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다."
      }
    ],
    "summaryBullets": [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다."
    ],
    "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다."
  }
}
```

`server/src/services/llmService.js`의 `analyzeArticle`은 아직 더미
응답이다(3주차에 실제 Claude 호출로 교체 예정 — `MOCK_LLM`과 무관하게 현재는
항상 `mockAnalyzeSuccess`를 반환). `terms`는 문단 텍스트에 `bear market` /
`ticker` / `guidance` / `sell-off` 중 포함된 용어만 문자열 매칭으로
골라내며, 각 항목은 `{ term, metaphor, definition }` 구조다(`word`/`meaning`
아님). `paragraphs`가 빈 배열이거나 배열이 아니면
`500 { success: false, error: "paragraphs is required" }`를 반환한다.

## 4. POST /api/decisions — 투자 판단 저장

```json
// 요청
{
  "url": "https://finance.yahoo.com/news/...",
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "summaryBullets": ["...", "...", "..."],
  "decision": "buy"
}

// 응답
{
  "success": true,
  "data": {
    "id": "1752368400000",
    "url": "https://finance.yahoo.com/news/...",
    "title": "Tech Stocks Slide as Investors Brace for Bear Market",
    "summaryBullets": ["...", "...", "..."],
    "decision": "buy",
    "createdAt": "2026-07-13T10:00:00+09:00"
  }
}
```

`server/src/services/decisionStore.js`의 `appendDecision`이 저장한 레코드를
그대로 응답한다. `id`는 `Date.now()`를 문자열로 변환한 값이고, 저장 시각은
`savedAt`이 아니라 `createdAt`이다. `url`/`title`/`decision`이 요청에
없으면 `500 { success: false, error: "url, title, decision are required" }`를
반환한다(`summaryBullets`는 선택값, 없으면 빈 배열로 저장).

## 5. GET /api/decisions — 히스토리 조회

```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "id": "1752368400000",
        "url": "https://finance.yahoo.com/news/...",
        "title": "Tech Stocks Slide as Investors Brace for Bear Market",
        "summaryBullets": ["...", "...", "..."],
        "decision": "buy",
        "createdAt": "2026-07-13T10:00:00+09:00"
      }
    ]
  }
}
```

`server/data/decisions.json`을 그대로 읽어 반환한다(`readDecisions`).
`isLinkExpired` 필드는 서버·저장 로직 어디에도 존재하지 않는다 — 원문 링크
만료 여부는 아직 서버에서 판단하지 않으며, 마이페이지 Fallback 복기 UI는
현재 저장된 `summaryBullets`만으로 구성해야 한다.
