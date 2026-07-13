# API 스펙 (`docs/api-spec.md`)

프론트엔드-백엔드 통신을 위해 사전 합의한 요청/응답 스키마입니다.
모든 응답은 `{ success: boolean, data 또는 error }` 형식으로 통일합니다.

## 1. GET /api/dashboard — 오늘의 핵심 외신 3개

```json
{
  "success": true,
  "data": {
    "articles": [
      {
        "id": "art_001",
        "category": "MARKETS",
        "titleEn": "S&P 500 Hits New Record as Tech Rally Continues",
        "summaryKo": "테크주 랠리 지속으로 S&P 500 지수가 사상 최고치를 경신했습니다.",
        "sourceUrl": "https://finance.yahoo.com/news/...",
        "tickers": ["SPY", "QQQ"],
        "publishedAt": "2026-07-13T09:12:00+09:00"
      }
    ]
  }
}
```

## 2. POST /api/article/parse — 외신 URL 파싱

```json
// 요청
{ "url": "https://finance.yahoo.com/news/..." }

// 응답 (성공)
{
  "success": true,
  "data": {
    "title": "Apple Raises iPhone Production Forecast...",
    "bodyText": "Apple said on Tuesday it has raised its guidance for iPhone production...",
    "sourceUrl": "https://finance.yahoo.com/news/..."
  }
}

// 응답 (실패 - Fallback 트리거)
{
  "success": false,
  "error": "PARSE_FAILED",
  "message": "원문을 불러올 수 없습니다.",
  "fallbackText": "(하드코딩된 더미 기사 텍스트)"
}
```

## 3. POST /api/article/analyze — 툴팁/요약/인사이트 생성

```json
// 요청
{ "bodyText": "Apple said on Tuesday it has raised its guidance..." }

// 응답
{
  "success": true,
  "data": {
    "terms": [
      { "word": "guidance", "metaphor": "회사가 미리 알려주는 성적표 예고편 같은 거예요.", "meaning": "기업이 향후 실적에 대해 공식적으로 제시하는 전망치." }
    ],
    "summaryBullets": [
      "애플이 아이폰 생산량 전망치를 상향 조정했다.",
      "AI 기능 수요 증가가 주요 원인으로 지목된다.",
      "3분기 매출 가이던스가 시장 예상치를 웃돌 것으로 전망된다."
    ],
    "insight": "생산량 전망 상향은 통상 다음 분기 매출 기대감을 높여 단기적으로 주가에 긍정적으로 작용하는 경우가 많습니다."
  }
}
```

## 4. POST /api/decisions — 투자 판단 저장

```json
// 요청
{
  "articleTitle": "Apple Raises iPhone Production Forecast...",
  "articleUrl": "https://finance.yahoo.com/news/...",
  "aiSummary": ["...", "...", "..."],
  "decision": "buy"
}

// 응답
{ "success": true, "data": { "id": "dec_001", "savedAt": "2026-07-13T10:00:00+09:00" } }
```

## 5. GET /api/decisions — 히스토리 조회

```json
{
  "success": true,
  "data": {
    "decisions": [
      {
        "id": "dec_001",
        "articleTitle": "Apple Raises iPhone Production Forecast...",
        "articleUrl": "https://finance.yahoo.com/news/...",
        "aiSummary": ["...", "...", "..."],
        "decision": "buy",
        "isLinkExpired": false,
        "savedAt": "2026-07-13T10:00:00+09:00"
      }
    ]
  }
}
```