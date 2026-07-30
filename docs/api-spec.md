# API 스펙 (`docs/api-spec.md`)

> 실제 구현 기준으로 작성됨. 아래 엔드포인트는 모두 `server/src/routes/`,
> `server/src/services/`의 실제 코드를 기준으로 문서화했다. 프론트엔드-백엔드
> 통신은 모두 `{ success: boolean, data 또는 error }` 형식으로 통일한다.
>
> **2026-07-13 변경**: 리더뷰의 단어 인라인 인터랙션(하이라이트+팝업)을 제거하고
> 문장 단위 아코디언 번역으로 대체. 핵심 용어는 탭 여부와 무관하게 자동으로
> 단어장에 적재하는 방식으로 전환(`GET /api/vocabulary` 신규). `analyze`/`decisions`에
> `marketSentiment` 필드 추가.
>
> **2026-07-15 변경**: `insight`/`marketSentiment`는 리더뷰에서 판단 전까지 블라인드
> 처리(바텀시트에서 공개)하는 정책 추가. `POST/GET /api/decisions`에 `insight` 필드
> 신규 추가(인사이트 노트 아코디언에서 재사용). "마이페이지" 명칭을 "인사이트 노트"로 전면 변경.
>
> **2026-07-17 변경**: 단어장을 Supabase 저장으로 전환하며 사용자 계정(Supabase
> Auth) 도입. `GET /api/vocabulary`는 로그인 필수(`Authorization: Bearer <access_token>`
> 헤더 없으면 401). `POST /api/article/analyze`는 로그인 여부와 무관하게 동작하되,
> 로그인 상태면 `terms`가 해당 사용자 단어장에 자동 저장된다(비로그인 시 저장은
> 건너뛰고 분석 응답은 동일하게 반환). `decisions`는 아직 JSON 파일 저장소 그대로다.
>
> **2026-07-21 변경**: `POST /api/article-reads` 신규 추가(GitHub #16, 완독/판단
> 분리 로깅). `decisionStore.js`는 이미 Supabase로 전환됐다(위 changelog의
> "`decisions`는 아직 JSON 파일 저장소 그대로다"는 stale — GitHub #12로 완료됨).
>
> **2026-07-26 변경**: `GET /api/dashboard` 응답 카드에 `readabilityScore`
> 필드 추가(기사 난이도 뱃지). 대시보드 큐레이션 3단계(LLM 평가)에서 이미
> 계산되던 값을 카드 응답까지 노출한 것 — 통과 임계값 때문에 카드에 실리는
> 값은 항상 3~5 범위다.
>
> **2026-07-27 변경**: 리더뷰 로딩 지연 개선을 위해 `POST /api/article/analyze`
> 하나(5개 필드 단일 응답)를 fast lane(`sentences`+`summaryBullets`)과 slow
> lane(`terms`+`insight`+`marketSentiment`, 신규 `POST /api/article/analyze/details`)
> 두 엔드포인트로 분리. 클라이언트는 parse 성공 직후 둘을 병렬로 호출하고,
> fast lane 응답만으로 인터랙티브 리더뷰(원문+아코디언+요약+판단버튼)를 먼저
> 렌더링한다 — insight/marketSentiment는 원래도 판단 전까지 블라인드 처리되는
> 값이고 terms는 단어장 자동저장 부수효과일 뿐이라 늦게 도착해도 무방하다.

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
        "url": "https://www.nytimes.com/2026/07/12/business/fed-rate-path-guidance.html",
        "readabilityScore": 5
      }
    ]
  }
}
```

`readabilityScore`(1~5, 값이 높을수록 학습자가 읽기 쉬움)는
`dashboardCurationService.js`의 RSS 자동 수집·선별 파이프라인 3단계(LLM
평가)에서 매겨지며, 통과 임계값(`MIN_READABILITY_SCORE = 3`) 때문에 카드에
실리는 값은 항상 3~5다. 클라이언트는 이 점수를 쉬움(5)/보통(4)/어려움(3)
3단계 뱃지로 표시한다(`client/src/constants/difficulty.js`).

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

## 3. POST /api/article/analyze — 문장 번역·요약 생성 (fast lane)

리더뷰가 인터랙티브 뷰(원문+아코디언+요약+판단버튼)로 전환하는 데 즉시
필요한 두 필드만 반환한다. `terms`/`insight`/`marketSentiment`는
`3-1. POST /api/article/analyze/details`(slow lane)로 분리됐다(2026-07-27,
리더뷰 로딩 지연 개선).

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
    "summaryBullets": [
      "기술주 전반이 급락하며 베어마켓 우려가 커지고 있습니다.",
      "GlobalTech Corp(GTC)의 약한 실적 가이던스가 하락을 가속시켰습니다.",
      "전문가들은 단기 변동성은 있어도 장기 매수 기회로 보는 시각도 있다고 분석합니다."
    ]
  }
}
```

- `title`, `url`: 이 엔드포인트에서는 프롬프트 컨텍스트(제목)에만 쓰이고
  별도 부수효과는 없다(단어장 저장은 slow lane 담당).
- `sentences`: 전체 문장이 아니라, LLM이 구조상 어렵다고 판단한 문장만 선별
  (보통 기사 1건당 2~4개). 리더뷰에서 해당 문장을 탭하면 이 데이터를
  아코디언으로 펼쳐 보여준다. **팝업이 아닌 인라인 펼침(아코디언) 방식** —
  긴 번역 텍스트가 원문 문장을 가리지 않도록 하기 위함.
- `paragraphs`가 빈 배열이거나 배열이 아니면
  `500 { success: false, error: "paragraphs is required" }`를 반환한다.
- **인증**: 필요 없음(단어장 저장 부수효과가 없어 `attachUser`를 붙이지 않는다).

## 3-1. POST /api/article/analyze/details — 인사이트·심리·단어 생성 (slow lane, 신규 2026-07-27)

판단 전까지 블라인드 처리되는 `insight`/`marketSentiment`와, 단어장 자동
적재용 `terms`를 반환한다. 클라이언트는 `3. POST /api/article/analyze`와
**병렬로**(parse 성공 직후 동시에) 호출해, 사용자가 기사를 읽는 동안
백그라운드에서 준비해둔다.

```json
// 요청 (3번과 동일한 형태)
{
  "paragraphs": ["Shares of major technology companies fell sharply...", "..."],
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "url": "https://finance.yahoo.com/news/..."
}

// 응답
{
  "success": true,
  "data": {
    "terms": [
      {
        "term": "bear market",
        "definition": "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
        "excerpt": "Shares of major technology companies fell sharply on Friday as investors grew increasingly worried that the market is entering a bear market.",
        "excerptTranslation": "금요일 주요 기술주들이 급락했는데, 투자자들이 시장이 약세장에 진입하고 있다는 우려를 점점 더 키웠기 때문입니다."
      }
    ],
    "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
    "marketSentiment": "bearish"
  }
}
```

- `title`, `url`: 응답에는 나타나지 않으며, 분석된 `terms`를 출처와 함께
  단어장에 자동 저장하는 부수 효과(side effect)에만 사용된다.
- `terms`: `{ term, definition, excerpt, excerptTranslation }`로 구성. 기사당
  핵심 용어 3~5개를 AI가 자동 선별하며, 사용자의 탭 여부와 무관하게
  `4. GET /api/vocabulary` 저장소에 자동 적재된다(리더뷰 화면에는 노출되지
  않음). `excerpt`는 해당 term이 등장한 원문 문장(verbatim)으로, 단어장
  플래시카드 뒷면에 노출된다. LLM이 낸 값이 원문에서 검증되지 않으면
  `null`로 폴백한다. `excerptTranslation`은 그 excerpt의 한국어 번역으로,
  `excerpt` 검증에 실패하면(즉 `excerpt`가 `null`이면) 함께 `null`로
  폴백한다(원문 없는 번역만 단독으로 노출하지 않기 위함).
- `marketSentiment`: `"bullish" | "bearish" | "neutral"` 중 하나. 기사의
  객관적 톤을 AI가 판별한 값으로, 인사이트 노트에서 사용자의 판단과 비교하는 데 쓰인다.
- `paragraphs`가 빈 배열이거나 배열이 아니면
  `500 { success: false, error: "paragraphs is required" }`를 반환한다.
- **인증(선택)**: `Authorization: Bearer <access_token>` 헤더가 유효하면 그
  사용자의 단어장에 `terms`가 자동 저장된다. 헤더가 없거나 유효하지 않아도
  요청은 그대로 처리되며(401 아님), 단어장 저장만 건너뛴다.

> **UI 정책 (2026-07-15)**: `insight`와 `marketSentiment`는 이 응답에 항상 포함되지만,
> 프론트엔드는 리더뷰에서 사용자가 Bullish/Neutral/Bearish 판단을 내리기 전까지 두 값을
> 화면에 렌더링하지 않는다(블라인드 처리). 판단 후 열리는 바텀시트에서 두 값을 함께 공개한다.
> 이 호출이 fast lane보다 늦게 끝나 바텀시트가 열린 시점에 아직 도착하지 않았다면,
> 화면은 "AI가 비교 결과를 분석하고 있습니다..." 로딩 문구를 보여주다가 값이 오면 전환한다.

## 4. GET /api/vocabulary — 단어장 조회 (신규)

```json
{
  "success": true,
  "data": {
    "vocabulary": [
      {
        "term": "bear market",
        "definition": "주가가 장기간에 걸쳐 계속 하락하는 약세장을 뜻합니다.",
        "excerpt": "Shares of major technology companies fell sharply on Friday as investors grew increasingly worried that the market is entering a bear market.",
        "excerptTranslation": "금요일 주요 기술주들이 급락했는데, 투자자들이 시장이 약세장에 진입하고 있다는 우려를 점점 더 키웠기 때문입니다.",
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

- **인증(필수)**: `Authorization: Bearer <access_token>` 헤더가 없거나
  유효하지 않으면 `401 { success: false, error: "로그인이 필요합니다" }`를
  반환한다. 단어장은 Supabase의 `vocabulary` 테이블에 사용자별로 저장되므로
  로그인한 사용자의 것만 조회된다.

## 4-1. DELETE /api/vocabulary — 단어 삭제 (신규 2026-07-30)

```json
// 요청
{ "ids": ["3f2a1c9e-...-uuid", "a1b2c3d4-...-uuid"] }

// 응답
{ "success": true, "data": { "deletedIds": ["3f2a1c9e-...-uuid", "a1b2c3d4-...-uuid"] } }
```

- 단어장 화면의 개별 단어 삭제(상세 플래시카드)와 날짜 카드 삭제(마스터
  리스트, 같은 날짜에 저장된 단어 전체)를 이 엔드포인트 하나로 처리한다.
  개별 삭제는 `ids`에 단일 id를, 날짜 카드 삭제는 그 날짜에 속한 모든 id를
  담아 보낸다.
- `ids`가 빈 배열이거나 배열이 아니면
  `500 { success: false, error: "ids must be a non-empty array" }`를 반환한다.
- 소유권 검증: 서버는 `SUPABASE_SERVICE_ROLE_KEY`로 접속해 RLS를 우회하므로,
  `vocabularyStore.js`의 `deleteVocabularyTerms`가 `user_id` 조건을
  애플리케이션 레벨에서 직접 검사한다 — 본인 소유가 아닌 id는 조용히
  무시되며(에러 아님), `deletedIds`에는 실제로 삭제된 id만 담긴다.
- **인증(필수)**: `Authorization: Bearer <access_token>` 헤더가 없거나
  유효하지 않으면 `401`을 반환한다.

## 5. POST /api/decisions — 투자 판단 저장

```json
// 요청
{
  "url": "https://finance.yahoo.com/news/...",
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "summaryBullets": ["...", "...", "..."],
  "decision": "buy",
  "marketSentiment": "bearish",
  "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
  "memo": "과매도 국면이라 판단해 매수"
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
    "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
    "memo": "과매도 국면이라 판단해 매수",
    "createdAt": "2026-07-13T10:00:00+09:00"
  }
}
```

`server/src/services/decisionStore.js`의 `appendDecision`이 저장한 레코드를
그대로 응답한다. `id`는 `Date.now()`를 문자열로 변환한 값이고, 저장 시각은
`savedAt`이 아니라 `createdAt`이다. `url`/`title`/`decision`이 요청에
없으면 `500 { success: false, error: "url, title, decision are required" }`를
반환한다.

> **2026-07-15 변경**: `insight`를 필수 필드로 추가했다. 인사이트 노트의
> 히스토리 카드가 "AI 관점 해설 보기" 아코디언에서 이 값을 다시 보여줘야
> 하므로, 판단 저장 시점에 함께 영속화해야 한다(바텀시트가 이미 갖고 있는
> `insight` 값을 그대로 전달). `decision` 값 자체는 기존 `"buy"|"hold"|"sell"`을
> 유지하며, 화면의 Bullish 🐂 / Neutral ➖ / Bearish 🐻 라벨과 1:1로 매핑된다
> (`buy`→Bullish, `hold`→Neutral, `sell`→Bearish). `summaryBullets`/`marketSentiment`는
> 계속 선택값이다.

> **2026-07-26 변경**: `memo`(선택, nullable) 필드를 추가했다. 바텀시트의
> "내 생각 남기기"에 입력한 판단 근거 한 줄을 함께 저장한다. 이후 메모만
> 수정할 때는 이 엔드포인트를 다시 호출하지 않고 `8. PATCH
> /api/decisions/:id`를 쓴다(재판단 insert와 메모 수정을 분리해 인사이트
> 노트 카드가 중복 생성되지 않게 하기 위함).

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
        "insight": "실적 가이던스 하향은 단기적으로 주가에 부정적이지만, 이번 하락은 개별 기업 이슈보다 시장 전반의 심리적 반응에 가까워 과매도 국면일 가능성이 있습니다.",
        "memo": "과매도 국면이라 판단해 매수",
        "createdAt": "2026-07-13T10:00:00+09:00"
      }
    ]
  }
}
```

`decisionStore.js`의 `readDecisions`가 Supabase `decisions` 테이블을
`articles`와 join해 반환한다(위 changelog 참고 — 문서 본문의 예시 응답 `id`
포맷(`"1752368400000"`)은 구 JSON 저장소 시절 값으로 stale하며, 실제로는
Supabase가 발급하는 uuid다). 인사이트 노트의 히스토리 카드는 기본적으로
`decision`(나의 판단)과 `marketSentiment`(AI가 본 기사 톤)만 심플하게 나란히
보여주고, "🔽 AI 관점 해설 보기"를 탭했을 때만 `summaryBullets`와 `insight`,
원문 링크 버튼이 아코디언으로 펼쳐진다. `isLinkExpired` 필드는 서버·저장
로직 어디에도 존재하지 않는다 — 원문 링크 만료 여부는 아직 서버에서
판단하지 않으며, Fallback 복기는 아코디언 안에 항상 보존된
`summaryBullets`/`insight`만으로 구성된다.

## 7. POST /api/article-reads — 완독 이벤트 저장 (신규, GitHub #16)

```json
// 요청
{
  "url": "https://finance.yahoo.com/news/...",
  "title": "Tech Stocks Slide as Investors Brace for Bear Market",
  "decisionId": "3f2a1c9e-...-uuid"
}

// 응답
{
  "success": true,
  "data": {
    "id": "b7e6d5c4-...-uuid",
    "completedAt": "2026-07-21T10:00:00+09:00",
    "decisionId": "3f2a1c9e-...-uuid"
  }
}
```

- **판단 여부와 무관하게 호출된다**: 바텀시트에서 "인사이트 노트에 저장"을
  눌러 판단(매수/관망/매도)까지 실제로 저장한 경우(`decisionId`에 방금
  저장된 `decisions.id`를 채워 FK 연결), 저장 없이 이탈한 경우(바텀시트를
  저장하지 않고 닫았거나 판단 버튼 자체를 누르지 않은 경우) 완독 기준
  (판단버튼 영역 도달) 충족 후 리더뷰를 벗어나는 시점(`decisionId: null`)에
  각각 호출된다.
- `decisionId`는 선택 필드 — 없으면 `null`로 저장되며, 이는 "완독은 했지만
  판단은 하지 않음"을 뜻한다(`docs/plan.md`의 완독/판단수행률 분리 지표
  정책).
- `url`/`title`이 없으면 `500 { success: false, error: "url, title are required" }`를
  반환한다.
- **인증(필수)**: `Authorization: Bearer <access_token>` 헤더가 없거나
  유효하지 않으면 `401`을 반환한다. `article_reads`는 사용자별 완독
  히스토리이므로 로그인 사용자만 기록한다(비로그인 시 클라이언트가 호출
  자체를 건너뜀).
- 조회용 `GET /api/article-reads`는 아직 없다(현재 요구사항인 "분리 로깅 +
  FK 연결"에는 불필요 — 집계/조회 화면이 필요해지면 별도 Task).

## 8. PATCH /api/decisions/:id — 판단 근거 메모 수정 (신규, 2026-07-26)

```json
// 요청
PATCH /api/decisions/3f2a1c9e-...-uuid
{ "memo": "실적 가이던스는 나빴지만 과매도라 판단해 매수" }

// 응답 (본인 소유 + 존재)
{
  "success": true,
  "data": { "id": "3f2a1c9e-...-uuid", "memo": "실적 가이던스는 나빴지만 과매도라 판단해 매수" }
}

// 응답 (없거나 타 사용자 소유)
{ "success": false, "error": "decision not found" }  // 404
```

- 인사이트 노트 카드에서 이미 저장된 판단의 메모만 고쳐 쓸 때 쓴다. `memo`
  필드만 갱신하며, `decision`/`marketSentiment`/`insight` 등 다른 필드나
  row 자체는 건드리지 않는다 — 즉 이 엔드포인트는 새 row를 만들지 않으므로
  인사이트 노트에 카드가 중복 생성될 일이 없다.
- `memo`에 `null`을 보내면 메모를 지울 수 있다. 빈 문자열은 클라이언트가
  trim 후 `null`로 정규화해서 보낸다.
- 소유권 검증: 서버는 `SUPABASE_SERVICE_ROLE_KEY`로 접속해 RLS를 우회하므로,
  `decisionStore.js`의 `updateDecisionMemo`가 `user_id` 조건을 애플리케이션
  레벨에서 직접 검사한다 — 존재하지 않거나 본인 소유가 아니면 `404`를
  반환한다.
- **인증(필수)**: `Authorization: Bearer <access_token>` 헤더가 없거나
  유효하지 않으면 `401`을 반환한다.
