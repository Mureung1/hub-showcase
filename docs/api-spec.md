# API 스펙 (`docs/api-spec.md`)

> 실제 구현 기준으로 작성됨. 아래 엔드포인트는 모두 `server/src/routes/`,
> `server/src/services/`의 실제 코드를 기준으로 문서화했다. 프론트엔드-백엔드
> 통신은 모두 `{ success: boolean, data 또는 error }` 형식으로 통일한다.
>
> **2026-07-13 변경**: 리더뷰의 단어 인라인 인터랙션(하이라이트+팝업)을 제거하고
> 문장 단위 아코디언 번역으로 대체. 핵심 용어는 탭 여부와 무관하게 자동으로
> 단어장에 적재하는 방식으로 전환(`GET /api/vocabulary` 신규). `analyze`/`decisions`에
> `marketSentiment` 필드 추가.

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
(실제 외신 수집·선별 로직은 아직 없음 — 부록 Tier 1 "경제 캘린더(비UI)"가
이 로직의 신호로 검토 중).

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
성공하면 실제 파싱 결과를 반환하고, 403·404·페이지 구조 불일치 등으로
실패하면 라우트로 에러를 던지지 않고 서비스 내부에서 조용히 하드코딩된
더미 기사(`FALLBACK_ARTICLE`)로 대체해 반환한다. 즉 이 엔드포인트는 스크래핑
성공/실패 여부와 무관하게 **항상 `success: true`**이며, 실패 여부를
프론트엔드가 구분할 방법은 현재 없다. `url` 필드가 누락된 요청일 때만
라우트 자체에서 `500 { success: false, error: "url is required" }`를 반환한다.

## 3. POST /api/article/analyze — 문장 번역·요약·인사이트·심리·단어 생성

```json
// 요청
{
  "paragraphs": ["Shares of major technology companies fell sharply...", "..."],
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "url": "https://finance.yahoo.com/news/..."
}

// 응답
{
  "success": true,
  "data": {
    "sentences": [
      {
        "id": "s1",
        "text": "The discrepancy between projected cloud revenue and actual hardware sales will likely dictate the market's trajectory.",
        "translation": "예상 클라우드 매출과 실제 하드웨어 판매 사이의 괴리가 앞으로 시장의 방향을 좌우할 가능성이 큽니다.",
        "reason": "긴 주어(discrepancy between A and B)와 조동사구(will likely dictate)가 겹쳐 구조 파악이 어려운 문장"
      }
    ],
    "terms": [
      {
        "term": "bear market",
        "definition": "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다."
      }
    ],
    "summaryBullets": [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다."
    ],
    "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
    "marketSentiment": "bearish"
  }
}
```

- `sentences`: 전체 문장이 아니라, LLM이 구조상 어렵다고 판단한 문장만 선별
  (보통 기사 1건당 2~4개). 리더뷰에서 해당 문장을 탭하면 이 데이터를
  아코디언으로 펼쳐 보여준다. **팝업이 아닌 인라인 펼침(아코디언) 방식** —
  긴 번역 텍스트가 원문 문장을 가리지 않도록 하기 위함.
- `terms`: 기존 `{ term, metaphor, definition }`에서 **`metaphor` 필드를
  삭제**하고 `{ term, definition }`만 남김. 기사당 핵심 용어 3~5개를
  AI가 자동 선별하며, 사용자의 탭 여부와 무관하게 `4. GET /api/vocabulary`
  저장소에 자동 적재된다(리더뷰 화면에는 더 이상 노출되지 않음).
- 요청의 `title`/`url`은 `terms`를 단어장에 적재할 때 출처(`articleTitle`/
  `articleUrl`)로 함께 저장하기 위한 값이다. 응답 스키마에는 나타나지 않고,
  `analyzeArticle` 내부의 부수 효과(`appendVocabulary` 호출)에만 쓰인다.
  이 저장은 실패해도 무시되며 `terms`/`sentences` 등 원래 응답에는 영향을
  주지 않는다.
- `marketSentiment`: `"bullish" | "bearish" | "neutral"` 중 하나. 기사의
  객관적 톤을 AI가 판별한 값으로, 마이페이지에서 사용자의 판단과 비교하는 데 쓰인다.
- `paragraphs`가 빈 배열이거나 배열이 아니면
  `500 { success: false, error: "paragraphs is required" }`를 반환한다.

## 4. GET /api/vocabulary — 단어장 조회 (신규)

```json
{
  "success": true,
  "data": {
    "vocabulary": [
      {
        "term": "bear market",
        "definition": "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
        "articleTitle": "Tech Stocks Slide as Investors Brace for Bear Market",
        "articleUrl": "https://finance.yahoo.com/news/...",
        "addedAt": "2026-07-13T10:00:00+09:00"
      }
    ]
  }
}
```

`POST /api/article/analyze` 호출 시 서버가 `terms`를 출처(기사 제목/URL)와
함께 자동으로 저장하며, 이 엔드포인트는 그 누적 저장소를 최신순(시간
역순)으로 반환한다. 사용자의 탭 등 별도 액션 없이, 기사를 분석한 시점에
자동으로 쌓인다.

## 5. POST /api/decisions — 투자 판단 저장

```json
// 요청
{
  "url": "https://finance.yahoo.com/news/...",
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "summaryBullets": ["...", "...", "..."],
  "decision": "buy",
  "marketSentiment": "bearish"
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
    "marketSentiment": "bearish",
    "createdAt": "2026-07-13T10:00:00+09:00"
  }
}
```

`server/src/services/decisionStore.js`의 `appendDecision`이 저장한 레코드를
그대로 응답한다. `id`는 `Date.now()`를 문자열로 변환한 값이고, 저장 시각은
`savedAt`이 아니라 `createdAt`이다. `url`/`title`/`decision`이 요청에
없으면 `500 { success: false, error: "url, title, decision are required" }`를
반환한다(`summaryBullets`, `marketSentiment`는 선택값).

## 6. GET /api/decisions — 히스토리 조회

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
        "marketSentiment": "bearish",
        "createdAt": "2026-07-13T10:00:00+09:00"
      }
    ]
  }
}
```

`server/data/decisions.json`을 그대로 읽어 반환한다(`readDecisions`).
마이페이지는 `decision`(나의 판단)과 `marketSentiment`(AI가 본 기사 톤)을
나란히 표시해 판단의 타당성을 스스로 점검하는 데 사용한다. `isLinkExpired`
필드는 서버·저장 로직 어디에도 존재하지 않는다 — 원문 링크 만료 여부는
아직 서버에서 판단하지 않으며, 마이페이지 Fallback 복기 UI는 현재 저장된
`summaryBullets`만으로 구성해야 한다.
