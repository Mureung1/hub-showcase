# Beacon PRD — 1단계 MVP 상세 구현 스펙

> 이 문서는 **구현(어떻게)** 스펙이다. 배경·근거(왜/누구/무엇)는 [plan.md](plan.md)를 본다.
> 새 세션은 이 문서 + plan.md + CLAUDE.md를 읽고 [roadmap.md](roadmap.md) 순서로 개발한다.

---

## 1. 개요 & 범위

**목표**: 1인용으로 **감시 → 원클릭 기록 → AI 복기** 루프를 끝까지 완주.

**포함 (MVP)**
- 자연어 조건 입력(Discord) → Gemini 파싱 → 확인 → 저장
- Supabase Cron 감시 → KIS 평가 → Discord 알림(+메모리 한 줄) + 원클릭 기록 버튼
- 웹 저널(차트+마커+메모) + 복기 코칭 에이전트(도구 3종) + 히스토리

**제외 (Non-goals, plan.md §9)**: 실주문, 체결내역 자동연동, 공휴일 캘린더 자동화, 다중 사용자 UI(2단계).

**단일 사용자 전제**: 1단계는 계정 1개로 동작하되, **모든 테이블에 `user_id`를 두고 RLS 정책을 처음부터 정의**해 2단계 전환 비용을 없앤다. 1단계 Edge Function은 service role로 동작 가능.

---

## 2. 데이터 모델 (Supabase Postgres)

> 식별자·enum은 영어, 값·카피는 한국어. 원본 `portfolio.json` 조건 구조를 테이블로 정규화한 것.

```sql
-- 사용자 (Supabase auth.users 확장)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Discord 연결
create table discord_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  discord_user_id text not null,
  notify_channel_id text,               -- 알림 발송 채널
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (discord_user_id)
);

-- 감시 조건 (portfolio.json 의 condition 을 정규화)
create table conditions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null,                   -- 종목명 (표시용)
  ticker text not null,                 -- 005930 / AAPL
  market text not null check (market in ('KR','US')),
  exchange text,                        -- US 필수 (예: NASD)
  type text not null check (type in ('price','sma_cross')),
  operator text not null check (operator in ('>=','<=','>','<')),
  target numeric,                       -- type=price 일 때
  sma_window int check (sma_window in (20,60,240,480)), -- type=sma_cross 일 때
  status text not null default 'active' check (status in ('active','done','disabled')),
  delete_after_alert boolean not null default true,
  triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index on conditions (user_id, status);
create index on conditions (ticker);

-- 매매 기록
create table trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  ticker text not null,
  market text not null check (market in ('KR','US')),
  side text not null check (side in ('buy','sell','hold')),  -- 'hold'(관망)은 0005에서 추가됨
  price numeric not null,
  quantity numeric,                     -- MVP 선택
  traded_at timestamptz not null default now(),
  memo text,
  source text not null default 'discord_button' check (source in ('discord_button','manual')),
  condition_id uuid references conditions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on trades (user_id, ticker, traded_at desc);

-- ⬇️ 신규 마이그레이션 0006_trade_fields_and_usage.sql (매매 기록 필드 확장 + AI 사용 이력)
-- 매매 기록 확장: 셋업 태그(다중) + 감정 상태(단일). 투자 습관 코칭을 위한 구조화 입력.
alter table trades add column tags text[] not null default '{}';   -- 셋업 태그 (free text[], 후보는 프론트 상수)
alter table trades add column emotion text
  check (emotion in ('confident','anxious','impulsive','fomo','calm'));  -- 확신/불안/조급/FOMO/담담

-- AI 사용 이력 (향후 과금 모델 준비용 ledger — 현 단계는 기록만, 제한 미적용)
create table ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('review')),   -- 현재는 복기만. 향후 kind 확장(예: 'insight')
  trade_id uuid references trades(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on ai_usage_events (user_id, kind, created_at desc);
-- RLS: select-own(user_id = auth.uid()). insert는 Edge Function(service role)만 수행.
-- 과금 전환 시나리오: 요청 전 월별 count(*) 검사 + 할당량 초과 시 요청 거부 로직만 추가하면 됨.

-- AI 복기 결과
create table reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  headline text not null,               -- 한 줄 판단
  timing text,
  emotion text,
  repeated_mistake text,
  cited_trade_ids uuid[] not null default '{}',  -- 근거로 인용한 과거 매매
  raw jsonb,                            -- 에이전트 원응답 (감사/디버그)
  created_at timestamptz not null default now()
);
create index on reviews (trade_id);
```

**RLS 정책 (전 테이블)**: `enable row level security` 후 `user_id = auth.uid()` (reviews·`ai_usage_events`도 `user_id` 보유). 1단계 Edge Function은 service role 키로 우회.

**매매 기록 구조화 입력 (0006, 프론트 상수)**:
- **셋업 태그** `trades.tags` (다중선택, DB는 free `text[]`): 후보 `돌파` · `눌림목` · `추세추종` · `급등추격` · `낙폭매수` · `실적` · `뉴스/테마` · `배당/가치`. AI 복기의 반복 패턴 감지(예: "급등추격 태그 매매의 승률") 재료.
- **감정 상태** `trades.emotion` (단일선택, enum): `confident`(확신) · `anxious`(불안) · `impulsive`(조급) · `fomo`(FOMO) · `calm`(담담). 복기의 emotion 축과 직결.
- 확신도(1~5)·목표가/손절가는 **미채택**(마찰 최소화 우선, [roadmap.md](roadmap.md) §3 결정 7).

---

## 3. 자연어 조건 파싱 (Gemini)

**입력 경로**: Discord 슬래시 커맨드 `/알림 [자연어]` → Edge Function `discord-interactions`.

**모델**: `gemini-2.5-flash`, **Structured Outputs**(JSON 스키마 강제).

**출력 스키마**:
```json
{
  "ticker_query": "삼성전자",
  "market": "KR",
  "type": "price",
  "operator": ">=",
  "target": 80000,
  "sma_window": null,
  "delete_after_alert": true
}
```

> 파싱 스키마 상세 원문(필드 전체·프롬프트 규칙)은 [research.md](research.md) §8 참조 — 이쪽은 요약이고 그쪽이 더 상세한 원본 필드셋을 기준으로 삼는다.

**검증·확인 플로우**:
1. `ticker_query`를 종목 마스터로 조회(원본 `web/data/symbols/` 재사용 — TODO §10).
2. 후보 1개 → 바로 확인 카드 / 다중 후보 → Discord 버튼으로 선택.
3. 사용자가 **확인 버튼** → `conditions`에 저장(status=active).
4. 파싱 실패/모호 → 되묻는 메시지.

---

## 4. 감시 파이프라인 (Supabase Cron + Edge Function)

**스케줄**: Supabase Cron(pg_cron + pg_net) → Edge Function `monitor` 호출. 주기 5분(장중), 원본은 15분 — MVP는 5분 권장.

**Edge Function `monitor` 로직**:
```
1. status='active' 조건 전부 조회 → ticker 로 그룹핑(중복 호출 방지)
2. 각 ticker: KIS 현재가 + 일봉 조회 (호출 간 ≥0.2s 딜레이)
3. 조건 평가:
   - price:      current  <op> target
   - sma_cross:  SMA(window) 기준으로 (직전 종가 + 현재가) 교차 판정
4. 충족 시:
   a. 메모리 한 줄 생성 (§5) — 해당 ticker 과거 복기 조회
   b. Discord 알림 발송 (embed + 버튼)
   c. delete_after_alert=true → status='done', triggered_at=now()
      아니면 중복 방지 상태 기록 (원본 last_alerts.json 역할 → 테이블/컬럼)
5. 실패 종목은 요약 로깅
```

**장운영시간 필터**(원본 로직 재사용): KR 평일 09:00–15:30 KST, US 평일 04:00–20:00 America/New_York. 휴장 캘린더는 미반영(Non-goal).

**⚠️ KIS 클라이언트 재구현**: 원본은 **Python**. Edge Functions는 **Deno/TS** → KIS OAuth 토큰 발급/캐시 + 현재가/일봉 엔드포인트를 **TS로 재작성 필요**(§10 TODO, 최대 리스크).

---

## 5. 알림 & 원클릭 기록

**Discord 알림 메시지** (초기 목업 기준)
- Embed: 종목명·티커, 설정 조건, 현재가, **메모리 한 줄**.
- Components(버튼): `📥 매수 기록` / `📤 매도 기록` / `웹에서 열기`.
- `custom_id`에 `condition_id`·`ticker`·`price` 인코딩.

**메모리 한 줄 규칙** (Should, plan.md): 알림 직전 `reviews`⨝`trades`에서 같은 ticker의 최근 복기 1건 조회 → headline/repeated_mistake를 한 줄로. 없으면 생략.

**버튼 → 기록** (Edge Function `discord-interactions`):
1. 서명 검증(`DISCORD_PUBLIC_KEY`).
2. `custom_id` 파싱 → `trades` insert (side=버튼, price=트리거 시 현재가, traded_at=now, source='discord_button', condition_id).
3. ephemeral 응답 + 웹 저널 링크(메모 보완 유도).

---

## 6. 복기 코칭 에이전트 (핵심 · 에이전트성)

**트리거**: 웹에서 특정 trade의 "AI 복기 요청" 버튼 클릭 → Edge Function `review-agent`. **온디맨드(수동)이며 매매 기록 저장 시 자동 실행이 아니다.** 동일 `trade_id`는 캐시 반환(재생성 안 함).

**사용 이력 기록 (0006, 과금 준비)**: 복기를 **새로 생성**해 저장하는 데 성공하면 `ai_usage_events(user_id, kind='review', trade_id)` 1행 insert. 캐시 반환·실패 시엔 미기록. 현 단계는 기록만 하고 사용 횟수 제한은 걸지 않는다(향후 과금 모델 전환 시 이 ledger로 월별 사용량 산정).

**모델**: `gemini-2.5-flash`, **function calling 루프**(무거운 프레임워크 없이).

**도구 계약**:
| 도구 | 입력 | 출력 | 데이터원 |
|------|------|------|----------|
| `search_past_trades` | `{ticker?, side?, limit=10}` | `trades[] {id,ticker,side,price,traded_at,memo,tags,emotion}` | Supabase |
| `get_price_context` | `{ticker, date, window_days=10}` | `{candles[], pre_return, post_return}` | KIS 일봉 |
| `get_past_reviews` | `{ticker?, limit=5}` | `reviews[] {headline,timing,emotion,repeated_mistake,cited_trade_ids}` | Supabase |

**루프**:
```
system: "너는 투자 코치. 대상 매매를 타이밍/감정/반복실수 관점에서 복기하라.
         모든 주장은 도구 결과에 근거하고, 인용한 trade_id를 반드시 남겨라."
1. 대상 trade 컨텍스트 제공 (side/price/memo + **tags·emotion 포함** → 감정·셋업 기반 패턴 인용 유도)
2. 에이전트가 도구를 스스로 선택·호출 (최대 6회)
3. 근거 충분 → 구조화 출력 종료
```

**최종 구조화 출력** → `reviews` 저장:
```json
{
  "headline": "급등 직후 추격매수 패턴이 반복됩니다",
  "timing": "...", "emotion": "...", "repeated_mistake": "...",
  "cited_trade_ids": ["<uuid>", "<uuid>"]
}
```
**정지 조건**: 도구 6회 or 근거 확보. 도구 실패 시 해당 근거 제외(환각 방지). `cited_trade_ids`로 판단 검증 가능.

---

## 7. 화면 스펙 (Vite + React SPA)

> **본 §7의 라우트/화면 표가 라우트 구조의 단일 원천이다.** design.md §7은 이 표를 참조하며 화면별 디자인 노트만 다룬다.

lightweight-charts는 프레임워크 무관 → 원본 investment_journal 차트 로직 참고 가능.

| 화면 | 라우트 | 핵심 컴포넌트 | 상태/데이터 |
|------|--------|--------------|------------|
| 로그인/Discord 연결 | `/login` | Supabase Auth UI, Discord 연결 버튼 | `profiles`, `discord_links` |
| 대시보드 | `/dashboard` | 종목검색, 관심종목(국내/해외), 최근기록 | `watchlists`, `trades` |
| 관심종목 | `/watchlist` | 시세 카드 그리드(국내/해외) | `watchlists` + `market-data` |
| **종목 페이지** | `/stock/:ticker` | lightweight-charts(년/월/주/일)+마커, **차트 클릭→기록 팝업**, 매매기록 폼, 조건설정, 이 종목 기록/조건 리스트 | `trades`, `conditions`, `alerts`, KIS |
| 조건 관리 | `/conditions` | 종목별 그룹 조건 리스트(상태 뱃지), 클릭→상세 | `conditions` |
| **조건 상세** | `/condition/:id` | operator/target/상태 **수정 + 삭제** | `conditions` |
| **기록 상세** | `/trade/:id` | 전 필드 **수정 + 삭제** + **AI 복기 섹션**(버튼→결과, 기존 ReviewPage 흡수) | `trades`, `reviews`, `ai_usage_events` |
| 히스토리 | `/history` | 종목 그룹 + **소형 카드 그리드**, 카드 클릭→기록 상세 | join |

> `/review/:tradeId`(구 ReviewPage)는 `/trade/:id`로 **흡수·리다이렉트**한다. 구 저널(`/journal`)은 이미 `/history`·`/stock/:ticker`로 대체됨([roadmap.md](roadmap.md) 부록 B).

**차트 클릭으로 과거 일자 기록** (종목 페이지):
- lightweight-charts v5 `chart.subscribeClick`으로 클릭 지점의 봉 시각을 취득 → 기록 팝업 폼(`TradeForm` 모달)을 해당 날짜·종가로 프리필.
- **일봉**: 클릭한 봉의 날짜로 직행. **주/월/년봉**: 봉이 기간을 대표하므로 일자 선택 단계(date input, min/max=봉 범위)를 먼저 띄운 뒤 폼.
- 저장 시 `traded_at` = 선택 일자의 장마감 시각(KR 15:30 KST / US 16:00 ET), `source='manual'`. (기존엔 항상 `now()` 고정이었음)

**히스토리 소형 카드** (종목 그룹 내 2열 그리드, 모바일 1열):
- 표시 항목: side 라벨(관례색 매수 빨강/매도 파랑/관망 앰버) · 날짜·가격(·수량) · 셋업 태그 pill(최대 3, 초과 시 +n) · 감정 칩 · 복기 상태 뱃지(분석 완료/미복기) · 삭제 버튼.
- 메모 인라인 편집·"AI 복기 요청" 버튼은 카드에서 **제거** → 카드 클릭 시 `/trade/:id`(상세)로 이동해 그곳에서 수행. (현재 카드가 비대한 문제 해소)

---

## 8. 수용 기준 (Given/When/Then)

- **조건 알림**: Given 활성 price 조건, When 현재가가 operator·target 충족, Then 5분 내 Discord 알림 도착 + delete_after_alert면 status=done.
- **자연어 파싱**: Given "삼성전자 8만원 이상이면 알려줘", When /알림 실행, Then {ticker:005930, type:price, op:>=, target:80000} 확인 카드 표시.
- **원클릭 기록**: Given 알림의 매수 버튼, When 클릭, Then trades 1건 저장(가격·시각 자동) + ephemeral 확인.
- **복기 에이전트**: Given 대상 trade, When 복기 요청, Then 도구를 1회 이상 호출해 과거 매매를 인용(cited_trade_ids 비어있지 않음)한 결과 저장.
- **루프 완주(North Star)**: Given 알림→기록→복기, Then 히스토리에 완주 1건 표시.

---

## 9. MVP 작업 분해 (의존성 순서)

[roadmap.md](roadmap.md)와 연결. 권장 순서:

1. **기반**: Supabase 프로젝트 + §2 스키마/RLS + Vite 앱 골격 + Auth.
2. **파싱 관문**: Discord 슬래시 커맨드 + `discord-interactions` Edge Function + Gemini 파싱 + 확인 버튼 + conditions 저장.
3. **감시**: KIS TS 클라이언트 재구현 → `monitor` Edge Function + Supabase Cron + price 평가 → 알림 발송. (sma_cross는 그다음)
4. **기록**: 알림 버튼 → trades 저장 → 저널 차트/마커/메모.
5. **복기 에이전트**: 도구 3종 + function-calling 루프 + reviews 저장 + 결과 화면.
6. **히스토리** + 메모리 한 줄 연결(Should).

> 데모 최단 경로: price 조건 1개로 2→3→4→5를 한 종목에 대해 end-to-end.

---

## 10. 확인 완료 (2026-07-08, [docs/research.md](research.md))

> 0단계에서 원본 레포 2개를 조사해 전부 확정. 포팅 세부사항(엔드포인트/필드명/판정로직)은 research.md가 단일 참조점.

- [x] **KIS 엔드포인트/TR ID**: 토큰 `POST /oauth2/tokenP` + 현재가/일봉 4종(TR `FHKST01010100`/`HHDFS00000300`/`FHKST03010100`/`HHDFS76240000`) 확정, 일봉 응답은 최신순이라 reverse 필요 → research.md §1–§3.
- [x] **종목 마스터 포맷**: `{market, exchange, ticker, name, source}` JSON 배열(kr 3,577건/us 8,637건) → DB `symbols` 테이블로 시드해 재사용 → research.md §7.
- [x] **차트/마커 구현**: lightweight-charts **v5**(`chart.addSeries(CandlestickSeries, ...)`, time은 `"YYYY-MM-DD"` 문자열). 마커는 네이티브 `createSeriesMarkers` 사용, 캔들 색은 국내 관례(상승 `#e0453f`/하락 `#2f6bd6`). 원본 DB는 `entries` 단일 테이블 + `ai_analysis` jsonb였으나 본 PRD §2 분리 스키마 유지 → research.md §10.
- [x] **KIS 일봉 히스토리 깊이**: `get_price_context`(window_days=10)에는 충분. 1회 ~100행 캡 가능성 → SMA 20/60 완전 지원, 240/480은 구현 후 실측으로 확정 → research.md §4.
- [x] **Gemini 호출 방식**: Deno에서 **raw REST fetch** 확정(`generativelanguage.googleapis.com/v1beta/.../generateContent`, `x-goog-api-key` 헤더, `responseJsonSchema` structured output). SDK 불필요 → research.md §8.
- [x] **Discord 앱 설정**: Ed25519 검증(crypto.subtle)·인터랙션 타입 1/2/3·3초 제한 defer(type 5)+PATCH `@original`·bot 토큰으로 `POST /channels/{id}/messages`(버튼)·커맨드 등록 API 전부 확인. 시크릿 발급만 사용자 체크포인트로 남음 → research.md §9.
- [x] **감시 중복 방지 상태**: `conditions`에 `last_matched boolean`/`last_alerted_at timestamptz` 컬럼 추가, 매칭 **전이 시점**(edge-trigger)에만 알림, `delete_after_alert=true`면 `status='done'` → research.md §6.

## 환경 변수 (참고, 원본 기준)

`KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`(선택), `GEMINI_API_KEY`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
