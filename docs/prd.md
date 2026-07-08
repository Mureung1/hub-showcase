# Beacon PRD — 1단계 MVP 상세 구현 스펙

> 이 문서는 **구현(어떻게)** 스펙이다. 배경·근거(왜/누구/무엇)는 [plan.md](plan.md)를 본다.
> 새 세션은 이 문서 + plan.md + CLAUDE.md를 읽고 [checklist.md](checklist.md) 순서로 개발한다.

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
  side text not null check (side in ('buy','sell')),
  price numeric not null,
  quantity numeric,                     -- MVP 선택
  traded_at timestamptz not null default now(),
  memo text,
  source text not null default 'discord_button' check (source in ('discord_button','manual')),
  condition_id uuid references conditions(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on trades (user_id, ticker, traded_at desc);

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

**RLS 정책 (전 테이블)**: `enable row level security` 후 `user_id = auth.uid()` (reviews도 `user_id` 보유). 1단계 Edge Function은 service role 키로 우회.

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

**Discord 알림 메시지** (목업: [discord-alert.html](../mockups/discord-alert.html))
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

**트리거**: 웹 저널에서 특정 trade의 "AI 복기 요청" → Edge Function `review-agent`.

**모델**: `gemini-2.5-flash`, **function calling 루프**(무거운 프레임워크 없이).

**도구 계약**:
| 도구 | 입력 | 출력 | 데이터원 |
|------|------|------|----------|
| `search_past_trades` | `{ticker?, side?, limit=10}` | `trades[] {id,ticker,side,price,traded_at,memo}` | Supabase |
| `get_price_context` | `{ticker, date, window_days=10}` | `{candles[], pre_return, post_return}` | KIS 일봉 |
| `get_past_reviews` | `{ticker?, limit=5}` | `reviews[] {headline,timing,emotion,repeated_mistake,cited_trade_ids}` | Supabase |

**루프**:
```
system: "너는 투자 코치. 대상 매매를 타이밍/감정/반복실수 관점에서 복기하라.
         모든 주장은 도구 결과에 근거하고, 인용한 trade_id를 반드시 남겨라."
1. 대상 trade 컨텍스트 제공
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

lightweight-charts는 프레임워크 무관 → 원본 investment_journal 차트 로직 참고 가능.

| 화면 | 핵심 컴포넌트 | 상태/데이터 |
|------|--------------|------------|
| 로그인/Discord 연결 | Supabase Auth UI, Discord 연결 버튼 | `profiles`, `discord_links` |
| 조건 관리 | 조건 리스트(상태 뱃지), 삭제 | `conditions` |
| **저널** ([journal.html](../mockups/journal.html)) | lightweight-charts(일봉)+매매 마커, 기록 리스트, 메모 편집, "AI 복기 요청" | `trades`, KIS 일봉 |
| **복기 결과** ([ai-review.html](../mockups/ai-review.html)) | 판단 헤드라인, 타이밍/감정/반복실수 3분할, 인용 근거 카드 | `reviews` |
| 히스토리 | 완주 루프 목록(조건→기록→복기) | join |

---

## 8. 수용 기준 (Given/When/Then)

- **조건 알림**: Given 활성 price 조건, When 현재가가 operator·target 충족, Then 5분 내 Discord 알림 도착 + delete_after_alert면 status=done.
- **자연어 파싱**: Given "삼성전자 8만원 이상이면 알려줘", When /알림 실행, Then {ticker:005930, type:price, op:>=, target:80000} 확인 카드 표시.
- **원클릭 기록**: Given 알림의 매수 버튼, When 클릭, Then trades 1건 저장(가격·시각 자동) + ephemeral 확인.
- **복기 에이전트**: Given 대상 trade, When 복기 요청, Then 도구를 1회 이상 호출해 과거 매매를 인용(cited_trade_ids 비어있지 않음)한 결과 저장.
- **루프 완주(North Star)**: Given 알림→기록→복기, Then 히스토리에 완주 1건 표시.

---

## 9. MVP 작업 분해 (의존성 순서)

[checklist.md](checklist.md)와 연결. 권장 순서:

1. **기반**: Supabase 프로젝트 + §2 스키마/RLS + Vite 앱 골격 + Auth.
2. **파싱 관문**: Discord 슬래시 커맨드 + `discord-interactions` Edge Function + Gemini 파싱 + 확인 버튼 + conditions 저장.
3. **감시**: KIS TS 클라이언트 재구현 → `monitor` Edge Function + Supabase Cron + price 평가 → 알림 발송. (sma_cross는 그다음)
4. **기록**: 알림 버튼 → trades 저장 → 저널 차트/마커/메모.
5. **복기 에이전트**: 도구 3종 + function-calling 루프 + reviews 저장 + 결과 화면.
6. **히스토리** + 메모리 한 줄 연결(Should).

> 데모 최단 경로: price 조건 1개로 2→3→4→5를 한 종목에 대해 end-to-end.

---

## 10. 미해결 / 원본 레포 확인 필요 (새 세션 TODO)

- [ ] **KIS 엔드포인트/TR ID**: 현재가·일봉 정확한 경로와 OAuth 토큰 흐름 → `KIS_openapi`의 `kis_alert_bot/`, `main.py` 확인 후 **Deno/TS로 포팅**.
- [ ] **종목 마스터 포맷**: `KIS_openapi/web/data/symbols/` 구조 → 티커 검증에 재사용.
- [ ] **차트/마커 구현**: `investment_journal`의 lightweight-charts 셋업·매매 마커·실제 DB 스키마(README에 미기재) 확인.
- [ ] **KIS 일봉 히스토리 깊이**: `get_price_context`에 충분한지(원본 저널은 yahoo-finance2 사용) 확인, 부족 시 대안.
- [ ] **Gemini 호출 방식**: Deno에서 직접 REST vs Vercel AI SDK — Edge Function 환경 확인.
- [ ] **Discord 앱 설정**: slash command 등록, `DISCORD_PUBLIC_KEY`/`BOT_TOKEN`/`APPLICATION_ID` 시크릿.
- [ ] **감시 중복 방지 상태**: 원본 `last_alerts.json` 역할을 테이블/컬럼 중 무엇으로 둘지 확정.

## 환경 변수 (참고, 원본 기준)

`KIS_APP_KEY`, `KIS_APP_SECRET`, `KIS_BASE_URL`(선택), `GEMINI_API_KEY`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`.
