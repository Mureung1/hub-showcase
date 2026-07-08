# Beacon 기술 조사 — 원본 레포 포팅 참조 (research)

> 0단계(착수 전 확인) 결과를 정리한 문서. **이후 세션·서브에이전트는 원본 레포(`KIS_openapi`, `investment_journal`) 없이 이 문서만 보고 Deno/TS로 포팅할 수 있어야 한다.** 원본은 Python(`kis_alert_bot/`)과 Next.js(`web/`, `investment_journal`)로 작성되어 있으며, 여기 적힌 사실은 원본 코드를 그대로 옮긴 것이 아니라 **TS 포팅에 필요한 값만 발췌**한 것이다. "우리 결정"이라고 표시된 항목은 원본에 없던 것을 이번 프로젝트에서 새로 정한 사항이다.
>
> 참조: [plan.md](plan.md) · [prd.md](prd.md) · [checklist.md](checklist.md)

---

## 1. KIS OAuth 토큰

- **엔드포인트**: `POST {KIS_BASE_URL}/oauth2/tokenP` (base 기본값 `https://openapi.koreainvestment.com:9443`)
- **요청 body** (JSON): `{ "grant_type": "client_credentials", "appkey": "...", "appsecret": "..." }`
- **응답**: `access_token` 필드에 토큰 문자열. 원본은 `expires_in`(초) 또는 `access_token_token_expired`/`token_expired` 필드가 있으면 그것을 만료 시각으로 우선 사용하고, 없으면 발급 후 23시간(`DEFAULT_TOKEN_TTL`)을 TTL로 가정.
- **만료 안전마진**: `expires_in` 기준일 때 `issued_at + (expires_in - 600)초`. 즉 실제 만료 600초(10분) 전에 캐시를 무효화해 재발급.
- **데이터 API 공통 헤더**: 모든 시세/일봉 호출에 아래를 포함해야 함.
  - `authorization: Bearer {access_token}`
  - `appkey: {APP_KEY}`
  - `appsecret: {APP_SECRET}`
  - `tr_id: {엔드포인트별 TR ID}` (§2 참조)
  - `custtype: "P"` (개인)
  - `content-type: application/json`
- **캐시 전략 (우리 결정)**: Edge Function은 stateless이므로 DB 테이블 `kis_token_cache`에 1행만 유지.
  - 컬럼: `id`, `access_token`, `expires_at timestamptz`, `app_key_hash text` (앱키 변경 감지용, `sha256(app_key)`), `updated_at`
  - 호출 전 `expires_at > now() + interval '600 seconds'`이면 캐시 토큰 재사용, 아니면 재발급 후 upsert.
  - TTL 산정은 원본과 동일하게 `expires_in - 600초`, 없으면 23시간.
- **401/403 처리**: 데이터 API 호출이 401/403(또는 응답 본문에 "token"/"인증"/"토큰"/"만료" 등의 문구 포함)으로 실패하면 **토큰을 1회만 재발급**하고 동일 요청을 재시도. 재발급 후에도 실패하면 에러를 그대로 전파(무한 재시도 금지).

---

## 2. KIS 시세 엔드포인트 4종

공통: 모든 GET 요청은 위 헤더 + 아래 쿼리 파라미터. 응답 최상위에 `rt_cd`가 있고 `"0"`이 아니면 에러(`msg1` 또는 `msg_cd`에 사유). 숫자 필드는 문자열로 오며 쉼표(`,`)가 포함될 수 있어 **콤마 제거 후 `parseFloat`** 해야 함(예: `"73,500"` → `73500`).

### 2.1 국내 현재가
- `GET /uapi/domestic-stock/v1/quotations/inquire-price`
- `tr_id: FHKST01010100`
- 쿼리: `FID_COND_MRKT_DIV_CODE: "J"`, `FID_INPUT_ISCD: {6자리 종목코드}`
- 응답: `output.stck_prpr` (현재가)

### 2.2 해외 현재가
- `GET /uapi/overseas-price/v1/quotations/price`
- `tr_id: HHDFS00000300`
- 쿼리: `AUTH: ""`, `EXCD: {NAS|NYS|AMS}` (§3 매핑 참조), `SYMB: {티커}`
- 응답: `output.last` (현재가)

### 2.3 국내 일봉
- `GET /uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice`
- `tr_id: FHKST03010100`
- 쿼리: `FID_COND_MRKT_DIV_CODE: "J"`, `FID_INPUT_ISCD: {티커}`, `FID_INPUT_DATE_1: {시작일 YYYYMMDD}`, `FID_INPUT_DATE_2: {종료일 YYYYMMDD}`, `FID_PERIOD_DIV_CODE: "D"`, `FID_ORG_ADJ_PRC: "0"`
- 날짜 범위: 원본은 `(오늘 - 760일)` ~ `오늘`(Asia/Seoul 기준)을 요청. 760일 ≈ 525거래일로 SMA480 + 크로스판정용 전일치 + 안전마진을 노린 값(§4 참조, 실제 응답 행수는 미검증).
- 응답: `output2[]`(없으면 `output[]`) 배열, 각 행 `stck_clpr`(종가)
- **⚠️ 응답은 최신순(내림차순)으로 온다 → 시간순(오름차순)으로 쓰려면 `reverse()` 필수.** 종가가 0 이하인 행은 제외.

### 2.4 해외 일봉
- `GET /uapi/overseas-price/v1/quotations/dailyprice`
- `tr_id: HHDFS76240000`
- 쿼리: `AUTH: ""`, `EXCD: {NAS|NYS|AMS}`, `SYMB: {티커}`, `GUBN: "0"`(일봉), `BYMD: {기준일 YYYYMMDD, America/New_York 기준 오늘}`, `MODP: "1"`(수정주가)
- 응답: `output2[]`, 각 행 `clos`(종가)
- 이 엔드포인트는 국내와 달리 날짜 범위가 아니라 기준일(`BYMD`) + 자체 페이지네이션 방식 — 1회 호출로 받아오는 행 수가 제한적일 가능성이 높음(§4).
- 마찬가지로 **최신순 → reverse 필요**, 0 이하 종가 제외.

### 2.5 에러/재시도 공통 규칙
- HTTP 429 또는 5xx, 혹은 네트워크 타임아웃 → **최대 2회 재시도**, 매 시도 사이 `0.5초 * 시도횟수`만큼 대기(단순 선형 백오프: 0.5s, 1.0s).
- 401/403(인증 오류)은 재시도 카운트와 별개로 **토큰 재발급 후 1회만** 재시도(§1).
- 그 외 예외는 그대로 상위로 전파.

---

## 3. 거래소 코드 매핑 (2계열)

원본에는 **저장/표시용 코드**와 **KIS 시세 API 파라미터용 코드**가 서로 다르다. 종목 마스터(§7) JSON의 `exchange` 필드는 `NASD` / `NYSE` / `AMEX` 값을 쓰지만, KIS 해외 시세 API의 `EXCD` 파라미터는 `NAS` / `NYS` / `AMS`만 받는다. 매핑표(대소문자 무관, 원본 `EXCHANGE_ALIASES`):

| 저장/표시용(입력 허용값) | KIS API `EXCD` |
|---|---|
| `NASD`, `NASDAQ`, `NAS` | `NAS` |
| `NYSE`, `NYS` | `NYS` |
| `AMEX`, `AMS` | `AMS` |

포팅 시 시세/일봉 호출 직전에 이 매핑 함수를 항상 거쳐야 한다. 국내(`KR`)는 거래소 개념이 없고 `FID_INPUT_ISCD`에 6자리 종목코드만 사용.

---

## 4. 스로틀 & 일봉 히스토리 깊이

- **호출 간격(스로틀)**: 국내 API 호출 간 최소 **0.2초**, 해외 API 호출 간 최소 **1.0초**(해외가 국내보다 느슨한 rate limit). 원본은 마지막 호출 시각을 기록해두고 다음 호출 전에 부족한 만큼 대기하는 방식(모노토닉 타이머 기준).
- **일봉 깊이**: 원본은 국내 일봉에 760일치 날짜 범위를 요청하지만, **실제 응답이 1회 호출에 약 100행으로 캡될 가능성이 있고 이는 미검증**이다(해외 API는 애초에 날짜범위가 아니라 기준일 방식이라 더 제한적일 수 있음).
  - `get_price_context`(§PRD 6, `window_days=10`)에는 100행이면 충분.
  - 저널 차트도 최근 ~100거래일(약 5개월) 표시면 MVP 범위에서 문제 없음.
  - **SMA 20/60**은 100행 캡이어도 계산 가능(각각 20/60개 종가만 있으면 됨). **SMA 240/480은 100행 캡이면 데이터 부족**.
  - **결정**: MVP는 `conditions.sma_window`로 20/60만 완전 지원. 240/480은 Step 3에서 실제 KIS 응답 행수를 확인한 뒤(페이지네이션 파라미터가 있는지 포함) 지원 여부를 확정한다. 지원 불가로 판명되면 자연어 파싱 단계(§5)에서 "240/480일선은 아직 지원하지 않는다"고 되묻도록 처리.

---

## 5. SMA 크로스 판정 로직 (의사코드)

`SMA(closes, window)` = 시간순으로 정렬된 종가 배열의 **최근 window개 단순평균**(`closes.slice(-window)`의 평균). 종가 개수가 window보다 적으면 계산 불가(에러).

판정 함수 `isSmaCrossMatched(operator, closes, window, currentPrice)`:
```
todaySma = SMA(closes, window)

if closes.length < window + 1:
    # 전일 SMA를 계산할 데이터가 부족(신규상장 등) → 단순 비교로 폴백
    return compare(currentPrice, operator, todaySma)

prevCloses = closes[:-1]            # 마지막(당일) 종가 제외
prevSma = SMA(prevCloses, window)
prevClose = closes[-1]              # "전일 종가" = 배열의 마지막 값(당일 반영 전 최신 확정 종가)

if operator == ">=":                 # 상향 돌파
    return prevClose < prevSma AND currentPrice >= todaySma
if operator == "<=":                 # 하향 이탈
    return prevClose > prevSma AND currentPrice <= todaySma
```
- 핵심: **"현재가가 SMA 위/아래"가 아니라 "어제는 SMA 반대편, 오늘은 SMA 이쪽"인 교차 시점만 매칭**한다(매일 조건이 참으로 유지되는 상태가 아니라 전이 순간만 알림 — §6과 함께 중복 방지의 근거가 됨).
- `price` 타입 조건은 단순 비교: `>=`는 `currentPrice >= target`, `<=`는 `currentPrice <= target`. (원본은 `>`, `<`는 지원하지 않고 `>=`/`<=`만 지원했으나, PRD §2 스키마는 `>`, `<`도 enum에 포함해뒀다 — 확장 여지로 남기되 MVP 구현은 `>=`/`<=`만 있어도 무방)

---

## 6. 감시 중복 방지 (원본 `last_alerts.json` → DB 컬럼)

원본은 로컬 JSON 파일(`AlertStateStore`)에 조건별 상태(`matched`, `last_alerted_at`, `done` 등)를 저장해 "매칭 상태가 막 참이 된 전이 순간에만" 알림을 보내고, 이미 종료(`done`)된 조건은 재평가하지 않았다. 쿨다운(`cooldown_minutes`)이 설정된 조건은 이미 매칭 중이어도 쿨다운 경과 시 재알림(is_reentry) 가능했다.

**우리 결정**(PRD §2/§4 확정, 원본보다 단순화 — 쿨다운은 MVP 범위 밖):
- `conditions` 테이블에 컬럼 추가: `last_matched boolean not null default false`, `last_alerted_at timestamptz`.
- `monitor` 평가 로직: 이번 평가에서 `matched=true`이고 **직전 저장된 `last_matched=false`일 때만**(edge-trigger, 상태 전이 시점) 알림 발송.
- 알림 발송 후 `last_matched=true`, `last_alerted_at=now()`로 갱신.
- `delete_after_alert=true`(기본값)이면 알림 직후 `status='done'`, `triggered_at=now()`로 종결하여 이후 평가 대상에서 제외.
- `delete_after_alert=false` 조건은 `status='active'`를 유지하되 `last_matched`로 중복 알림만 막는다(재알림은 미해제 시 발생 안 함 — 쿨다운 없음, Non-goal).

---

## 7. 종목 마스터 데이터

- 원본 경로: `KIS_openapi/web/data/symbols/kr.json`(3,577건), `us.json`(8,637건). 형식은 **평평한 JSON 배열**, 각 원소:
  ```json
  { "market": "KR", "exchange": "KOSPI", "ticker": "000020", "name": "동화약품", "source": "KIS stocks_info" }
  ```
  ```json
  { "market": "US", "exchange": "NYSE", "ticker": "A", "name": "Agilent Technologies, Inc.", "source": "Nasdaq Trader Symbol Directory" }
  ```
- KR의 `exchange` 값은 `KOSPI`/`KOSDAQ`, US는 `NYSE`/`NASD`/`AMEX`(§3의 저장용 계열과 동일 — KIS API 호출 시에는 §3 매핑을 거쳐야 함).
- 검색 로직(원본 `symbols.js`, TS 포팅 시 참고할 스코어링 규칙만 발췌):
  - 정규화: NFKC 정규화 + 대문자화. "compact" 버전은 공백·기호 제거 버전을 별도로 만들어 완전일치/접두일치/포함 3단계로 매칭.
  - 티커 완전일치가 최고점, 이름 완전일치, 접두, 포함 순으로 점수 하락. 회사명 접미사(`INC`,`CORP`,`CO`,`LTD` 등)를 제거한 "companyName" 버전도 별도 매칭 대상.
  - `findSymbol({ticker, market, exchange})`: 정확 티커 + (US는 옵션으로 거래소까지) 일치하는 1건 조회 — Gemini가 제시한 후보(ticker/market/exchange)를 "로컬 종목 마스터로 재검증"할 때 이 방식 사용.
- **우리 결정**: Edge Function 번들에 1.5MB+527KB JSON을 넣지 않고, **`symbols` 테이블로 DB에 시드**(위 5개 컬럼 그대로) 후 `ilike` 검색(및 필요시 exact match)으로 대체. 시드 스크립트가 원본 JSON을 그대로 읽어 upsert.

---

## 8. Gemini 자연어 파싱 (Deno REST)

- **호출 방식**: 원본 `web/lib/gemini.js`가 이미 **SDK 없이 raw REST fetch**를 사용 — Deno Edge Function에서 동일 패턴 그대로 사용 가능.
  - `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
  - 헤더: `content-type: application/json`, `x-goog-api-key: {GEMINI_API_KEY}`
  - 모델: `gemini-2.5-flash` (env `GEMINI_MODEL`로 override 가능하게 해도 됨)
  - body: `{ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: SCHEMA } }`
  - 응답 파싱: `payload.candidates[0].content.parts[].text`를 이어붙여 `JSON.parse`.
- **원본 파싱 스키마** (`NATURAL_ALERT_SCHEMA`, 필드 전부 — PRD §3 스키마와 유사하되 이쪽이 더 상세하므로 포팅 시 이 필드셋을 기준으로 삼는다):
  | 필드 | 타입 | 설명 |
  |---|---|---|
  | `stock_query` | string | 종목명/티커 원문 |
  | `symbol_candidates` | array of `{ticker, market:["","KR","US"], exchange, company_name, confidence:number}` | LLM이 추리한 후보 종목 목록(최대 5개 권장), 모르면 빈 배열 |
  | `market_hint` | enum `""/"KR"/"US"` | 사용자가 시장을 명시했을 때만 채움 |
  | `condition_type` | enum `"price"/"sma_cross"/"unknown"` | |
  | `operator` | enum `""/">="/"<="` | |
  | `target` | number\|null | price 조건의 목표가(원/달러 등 단위 환산 완료된 숫자) |
  | `window` | integer\|null | sma_cross 기간(20/60/240/480) |
  | `needs_clarification` | boolean | 저장에 필요한 정보 부족 시 true |
  | `clarification_reason` | string | 되묻는 이유(한국어) |
- **프롬프트 규칙 요약** (원본 `buildPrompt`):
  - "이상","넘으면","돌파","회복" → `operator=">="`. "이하","아래","하락","깨지면","내려가면" → `operator="<="`. 방향이 불명확("도달하면") → `operator=""` + `needs_clarification=true`.
  - 이동평균선 기간이 20/60/240/480 중 하나가 아니면 `needs_clarification=true`.
  - "8만원","6만 원" 같은 표현은 80000/60000처럼 숫자로 환산.
  - 모르는 기업명/추상적 표현이면 `symbol_candidates`를 빈 배열로 둔다(임의 추정 금지).
  - 한국어 기업명 예시 매핑을 프롬프트에 명시: 애플→AAPL/US, 구글→GOOGL 또는 GOOG/US, 테슬라→TSLA/US, 엘지전자→066570/KR.
- **후보 재검증 규칙 (필수)**: LLM이 제시한 `symbol_candidates`는 추리일 뿐이며, **반드시 §7의 로컬 종목 마스터(`findSymbol`)로 재검증**해서 실제 존재하는 티커인지 확인한 것만 사용자에게 후보로 제시한다. 검증 통과 후보가:
  - 정확히 1개 → 바로 확인 카드 표시
  - 2개 이상 → 버튼으로 선택 요청(symbol_candidates 검증 결과가 없으면 stock_query 텍스트로 `searchSymbolMatches` 폴백 검색까지 시도한 뒤 그래도 여러 개면 선택 요청)
  - 0개 → "종목을 찾지 못했습니다" 실패 응답

---

## 9. Discord 연동

### 9.1 서명 검증 (인터랙션 엔드포인트)
- Discord는 매 요청에 `X-Signature-Ed25519`, `X-Signature-Timestamp` 헤더를 보낸다.
- 검증: `verify(null, timestamp + rawBody, publicKey, signature)` — Ed25519. Deno에서는 **`crypto.subtle.verify`**(Web Crypto)로 동일하게 구현 가능(원본은 Node `crypto.createPublicKey`+`crypto.verify`를 사용했지만 SPKI DER 프리픽스(`302a300506032b6570032100` + raw 32바이트 공개키)를 붙여 공개키를 구성하는 방식은 Deno에서도 재현 가능하다. 혹은 Deno `crypto.subtle.importKey("raw", pubKeyBytes, "Ed25519", ...)`로 raw 공개키를 바로 import하는 편이 더 간단).
- 서명 실패 시 401 반환, 본문 파싱/처리 이전에 반드시 검증.

### 9.2 인터랙션 타입
- `type: 1` → PING, 응답 `{ type: 1 }`(PONG) 그대로.
- `type: 2` → APPLICATION_COMMAND(슬래시 커맨드, 예 `/알림 내용:...`). 옵션 값은 `interaction.data.options[]`에서 `type: 3`(STRING) 항목 탐색(중첩 서브커맨드 옵션도 재귀 탐색).
- `type: 3` → MESSAGE_COMPONENT(버튼 클릭). `interaction.data.custom_id`로 어떤 버튼인지 식별.
- **3초 응답 제한**: Discord는 인터랙션에 3초 내 응답을 요구. Gemini 파싱처럼 느릴 수 있는 처리는 즉시 `type: 5`(DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE, ephemeral이면 `data.flags: 1<<6`)로 우선 응답한 뒤, 처리가 끝나면 후속으로 **`PATCH https://discord.com/api/v10/webhooks/{application_id}/{interaction.token}/messages/@original`**(헤더 `content-type: application/json`, body에 최종 메시지 payload)로 원본 메시지를 교체한다.
- 버튼 클릭 응답에는 `type: 6`(DEFERRED_UPDATE_MESSAGE, 로딩 없이 조용히 넘어갈 때) 또는 `type: 7`(UPDATE_MESSAGE, 기존 메시지를 즉시 갱신 — 이때 `components: []`로 버튼 제거 가능)도 사용 가능.

### 9.3 알림 발송 (Bot API)
- 원본은 Webhook URL로 단순 embed만 보냈으나(`build_alert_embed` — 색상: `>=`는 초록(`0x2ECC71`), `<=`는 빨강(`0xE74C3C`), 에러 요약은 노랑(`0xF1C40F`)), **버튼(원클릭 기록)을 붙이려면 Webhook이 아니라 Bot 토큰으로 채널에 직접 메시지를 보내야 한다**(Webhook 메시지도 컴포넌트 첨부가 가능하긴 하나, PRD가 Bot API로 결정).
- **결정**: `POST https://discord.com/api/v10/channels/{channel_id}/messages`, 헤더 `authorization: Bot {DISCORD_BOT_TOKEN}`, body에 `embeds`(위 색상 규칙 재사용) + `components`(버튼, §9.4 형식).

### 9.4 버튼 컴포넌트 & `custom_id` 인코딩
- 컴포넌트 트리: `{ type: 1 (ActionRow), components: [ { type: 2 (Button), style, label, custom_id }, ... ] }`. `style: 3`=초록(확인/저장), `style: 4`=빨강(취소), `style: 2`=회색(보조 선택지).
- **`custom_id` 파이프(`|`) 인코딩 관례**(원본): 접두어 + 필드들을 `|`로 join.
  - 확인 버튼: `kisac:|{market}|{exchange or ""}|{ticker}|{condition_type}|{gte|lte}|{target 또는 window}`
  - 후보 선택 버튼: `kissel:|{market}|{exchange or ""}|{ticker}|{condition_type}|{gte|lte}|{value}`
  - 취소 버튼: `kis_alert_cancel`(고정 문자열, 파라미터 없음)
  - 디코딩: `split("|")`로 역파싱 후 `operator`는 `gte→">="`, `lte→"<="`로 복원, 종목은 다시 §7 종목 마스터로 재검증(`findSymbol`) 후 존재하지 않으면 에러.
  - **원클릭 기록 버튼**(PRD §5)도 같은 관례를 따르되 페이로드는 `condition_id`·`ticker`·`price`를 인코딩(예: `record:buy|{condition_id}|{ticker}|{market}|{price}`처럼 우리 쪽에서 새로 정의).
- **슬래시 커맨드 등록**: `POST https://discord.com/api/v10/applications/{application_id}/commands`(또는 `/guilds/{guild_id}/commands`로 길드 한정, 헤더 `authorization: Bot {token}`). 원본 커맨드 정의:
  ```json
  { "name": "알림", "description": "자연어로 주식 알림 조건을 설정합니다.", "type": 1,
    "options": [ { "name": "내용", "description": "예: 삼성전자가 8만원 이상이면 알려줘", "type": 3, "required": true } ] }
  ```
  응답 JSON의 `id`가 등록된 커맨드 ID. 스크립트는 Node/Deno 어디서든 fetch만으로 동작.

---

## 10. lightweight-charts v5 (저널 차트)

- 패키지는 `lightweight-charts`(v5). **v4의 `chart.addCandlestickSeries({...})`는 v5에 없음** — v5는 `chart.addSeries(CandlestickSeries, {...options})` 형태(시리즈 타입을 첫 인자로 명시적으로 전달).
- `createChart(container, { autoSize: true, layout: { background: {type: ColorType.Solid, color}, textColor }, grid: {...}, rightPriceScale: {...}, timeScale: { timeVisible: true }, crosshair: { mode: 1 } })`.
- 캔들 데이터 포맷: `{ time: "YYYY-MM-DD", open, high, low, close }` — `time`은 **문자열**(Time 유니온 타입 중 BusinessDay string) 사용, KIS 일봉의 날짜를 `YYYYMMDD` → `YYYY-MM-DD`로 변환해서 채운다.
- **매매 마커**: 원본(`investment_journal`)은 lightweight-charts 네이티브 마커가 아니라 **HTML 오버레이 엘리먼트**(절대 위치 지정, `timeScale().timeToCoordinate()` + `series.priceToCoordinate()`로 좌표 계산해 아이콘 배치)로 구현했다. **우리 결정**: 구현 단순화를 위해 v5 네이티브 API인 **`createSeriesMarkers(series, markers[])`**(마커 전용 플러그인 함수, v5에서 분리된 API)를 사용한다. 마커 객체는 `{ time, position: "aboveBar"|"belowBar", color, shape: "arrowUp"|"arrowDown", text }` 형태.
- **캔들 색상(국내 관례로 확정)**: 목업 [journal.html](../mockups/journal.html)의 CSS 변수 기준 — **상승(양봉) `#e0453f`(빨강)**, **하락(음봉) `#2f6bd6`(파랑)**. (원본 investment_journal은 서구 관례로 `upColor:"#059669"`(초록)/`downColor:"#dc2626"`(빨강)를 썼으나, Beacon은 목업 색을 따라 국내 관례로 뒤집는다.) `addSeries(CandlestickSeries, { upColor:"#e0453f", downColor:"#2f6bd6", borderUpColor:"#e0453f", borderDownColor:"#2f6bd6", wickUpColor:"#e0453f", wickDownColor:"#2f6bd6" })`.

**원본 저널 DB 스키마(참고용, PRD 채택 안 함)**: 원본은 `entries` 단일 테이블(`symbol, entry_type(buy/sell/hold), entry_date, price, amount, emotion, hypothesis, conviction, ai_analysis jsonb`)에 AI 분석까지 인라인으로 저장했다. Beacon PRD §2는 `trades`/`reviews`를 분리한 스키마가 우월하다고 판단해 **원본 구조를 따르지 않고 PRD 스키마 그대로 간다**(참고만).

---

## 11. 장운영시간 필터

- **한국(KR)**: 평일(월~금, `weekday() < 5`) **09:00–15:30**, 타임존 `Asia/Seoul`.
- **미국(US)**: 평일 **04:00–20:00**, 타임존 `America/New_York`(서머타임 자동 반영됨 — IANA 타임존 이름 기반이라 DST 계산이 자동 처리됨).
- 공휴일 캘린더는 원본에도 없고 Non-goal로 유지.
- Deno 구현: `Temporal` 미사용, **`Intl.DateTimeFormat(timeZone, {...}).formatToParts()`** 또는 `new Date().toLocaleString("en-US", {timeZone})`로 로컬 시각의 요일·시:분을 뽑아 비교하면 원본 Python(`zoneinfo` 기반)과 동일한 결과를 낼 수 있다.

---

## 12. 요약: 결정 사항 체크리스트

| 결정 | 근거 |
|---|---|
| `kis_token_cache` DB 테이블 1행 캐시, TTL 23h, 안전마진 600초 | §1 |
| SMA 20/60만 MVP 완전 지원, 240/480은 Step 3 실측 후 확정 | §4 |
| `conditions.last_matched`/`last_alerted_at`로 edge-trigger 알림 + `delete_after_alert` 시 `status='done'` | §6 |
| 종목 마스터를 `symbols` 테이블로 DB 시드(번들 비대 방지) | §7 |
| Gemini는 Deno raw REST fetch로 직접 호출(SDK 불필요) | §8 |
| 알림 발송은 Webhook이 아닌 Bot 토큰 채널 POST(버튼 필요) | §9.3 |
| 저널 마커는 HTML 오버레이 대신 v5 네이티브 `createSeriesMarkers` | §10 |
| 캔들 색은 국내 관례(상승 빨강 `#e0453f`/하락 파랑 `#2f6bd6`, 목업 기준) | §10 |
| 저널 DB는 원본 `entries` 단일테이블이 아니라 PRD `trades`/`reviews` 분리 스키마 유지 | §10 |
