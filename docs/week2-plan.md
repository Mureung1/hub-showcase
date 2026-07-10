# Beacon 2주차 개발 계획 — 프로토타입 ↔ MVP 비교 + 태스크

> 1주차 산출물(동작 MVP ver1 + Robinhood 디자인 프로토타입)을 대조 평가하고,
> 2주차 개발을 **프로토타입 기준**으로 정렬하기 위한 실행 문서.
> 기획 원천은 [plan.md](plan.md), 디자인 원천은 [design.md](design.md).

## 0. 개요

- **MVP** ([mvp/](../mvp/)) — 감시→기록→복기 루프가 end-to-end 배선된 동작 버전. Supabase Edge Functions + Cron + KIS + Gemini.
- **프로토타입** ([prototype/](../prototype/)) — 목데이터 기반 비동작. Robinhood 디자인 + 확정된 UX(대시보드·관망·Discord 경험 데모)의 UI 토대.
- **2주차 목표(한 줄)**: 프로토타입에서 확정된 화면·디자인·UX를 MVP의 실배선 위에 올려, 프로토타입과 같은 경험을 실제 데이터로 동작하게 만든다.

## 1. 평가 결론

**MVP의 구현 방향은 옳다.** 서비스의 존재 이유인 "감시→기록→복기" 루프가 실제로 끝까지 배선돼 있고, 에이전트다움의 본체인 **AI 복기가 진짜 에이전트**로 구현돼 있다. 남은 간극은 대부분 *프로토타입이 원래 기획보다 앞서 추가한 항목*(관망·대시보드·웹 Discord연결)과 *디자인 미반영*이다.

### 잘 된 것 (유지)
- **AI 복기 = 진짜 에이전트**: `_shared/gemini.ts`의 `runAgentLoop`이 Gemini function-calling **다단계 루프**(최대 6회)로, `search_past_trades`·`get_price_context`·`get_past_reviews` **3종 도구를 모델이 스스로 호출**. 근거 수집 후 도구를 끈 채 structured output으로 최종화. → 1-shot 아님. (`mvp/supabase/functions/review-agent/index.ts`)
- **검증 가능성**: `cited_trade_ids`를 UUID·실존 여부로 **환각 필터링 후 저장**, 전체 transcript를 `reviews.raw`에 audit. 복기 출력(headline + timing/emotion/repeated_mistake)이 프로토타입 복기 화면과 정확히 일치.
- **다중사용자 전제**: 전 테이블 RLS(`auth.uid()=user_id`), `profiles`/`discord_links` 존재. (`0001_schema.sql`)
- **감시 파이프라인**: Cron 5분 주기 → `monitor` → KIS 시세 → price/sma_cross 평가 → edge-trigger 알림. 자연어 파싱(Gemini structured) + 확인 카드 + 원클릭 기록→`trades` insert.

## 2. 프로토타입 ↔ MVP 대조표

| # | 프로토타입 시나리오 | MVP 상태 | 근거 |
|---|---|---|---|
| ① | 자연어 조건 입력 (Discord) | ✅ 구현 | `discord-interactions` `handleCommand`가 `내용` 옵션 파싱 |
| ② | AI 파싱 확인 (확정/취소) | ✅ 구현 | `parseNaturalAlert`+`NATURAL_ALERT_SCHEMA`, `buildConfirmCardPayload`. 단 DB엔 `disabled`로 먼저 저장→확정 시 `active` |
| ③ | 감시 (Cron + KIS) | ✅ 구현 | `0002_cron.sql` `*/5 * * * *` → `monitor`. **price·sma_cross만** (volume 없음) |
| ④ | 알림 + 과거 복기 메모리 한 줄 | ✅ 구현 | `monitor` `fetchMemoryLine`이 `reviews` 조회 → embed. **알림 시점 LLM 생성은 아님** |
| ⑤ | 원클릭 기록 매수/매도/**관망** | ⚠️ 부분 | 매수/매도만. `handleTrade`가 buy/sell 외 거부, `trades.side check(buy/sell)` |
| ⑥ | 웹 저널 (차트+마커+메모) | ✅ 구현 | `JournalPage` 차트+매수/매도 마커+메모 inline 저장. **관망 마커 없음** |
| ⑦ | AI 복기 (도구 다단계 + 과거 인용) | ✅✅ 일치 | `review-agent` 에이전트 루프, `ReviewPage` 3셀+인용 |
| ⑧ | 히스토리 완주 루프 | ✅ 구현 | `HistoryPage` 조건→기록→복기, 완주 카운트 |
| ➕ | 대시보드 (종목검색/관심종목/최근기록) | ❌ 없음 | 라우트 없음, 로그인 후 `/journal` 직행. 단 `symbols` trigram 인덱스는 준비됨 |
| ➕ | 로그인 화면 Discord 연결 | ❌ 없음 | `LoginPage`는 이메일/비번만. `discord_links` 테이블은 존재 |
| ➕ | 디자인(Robinhood 다크+그린) | ❌ 미반영 | `mvp/src/index.css`는 아직 이전 보라 토큰 |

## 3. 2주차 개발 태스크

우선순위: **T1 → T2 → T3 → T4 → 선택(T6, T5는 2주차 이후로 연기)**.

> 결정 완료(§4): ① 관망은 1급 개념으로 채택 → T3 확정 수행. ② 관심종목은 신규 `watchlists` 테이블. ③ 알림 메모리 에이전트화(T5)는 2주차 이후로 연기.

### T1. 디자인 정합 (최우선)
MVP 웹을 프로토타입 디자인 시스템으로 재정렬. 프로토타입이 UI 토대이므로 먼저.
- `mvp/src/index.css` 토큰을 [design.md](design.md) §2~§4(Robinhood 다크+그린) 값으로 교체(변수 이름 유지).
- 공용 컴포넌트/화면을 프로토타입 구조에 맞춰 정리(카드·pill 버튼·뱃지·verdict·cell 등). 하드코딩 색 제거.
- **수용 기준**: MVP 전 화면이 다크(블랙)+그린으로 렌더되고, `beacon-design` 스킬 체크리스트 통과.
- 대상: `mvp/src/index.css`, `mvp/src/pages/*.css`, `mvp/src/components/*`.

### T2. 대시보드 신설
프로토타입 `DashboardPage`를 실데이터로 이식.
- `/dashboard` 라우트 추가, 로그인 후 진입점 `/journal`→`/dashboard` (`LoginPage`·`App.jsx`).
- 종목검색 = `symbols` trigram 검색(RPC 또는 `ilike`), 관심종목 = `market-data` 시세, 최근기록 = `trades`.
- **수용 기준**: 검색→저널 이동, 관심종목 시세 카드, 최근기록 카드가 실데이터로 동작.
- 참고: `prototype/src/pages/DashboardPage.jsx`, `prototype/src/mock/symbols.js`.
- **관심종목 저장 = 신규 `watchlists` 테이블**(결정 완료). 컬럼: `id, user_id, symbol, market, exchange, created_at` + `unique(user_id, symbol)`. RLS는 기존 테이블과 동일하게 `auth.uid()=user_id`. 대시보드는 이 테이블 조회 + `market-data`로 시세 붙임.

### T3. 관망(hold) 반영 — **채택 확정**
"진입 안 함"도 기록·복기 대상에 포함한다(1급 개념).
- 마이그레이션: `trades.side` check에 `'hold'` 추가, `price` nullable(또는 관측가 저장), `quantity`는 이미 nullable.
- 디스코드: 알림에 관망 버튼(`custom_id: bcn|trade|hold|{condition_id}|{price}`), `handleTrade`가 hold 허용, `sideLabel` 3-way.
- 웹: 저널 관망 마커(⏸/앰버) + 복기·히스토리 라벨 **buy-else-sell 이분법 → 3-way** 수정.
- **수용 기준**: Discord 관망 기록 → `trades`(side=hold) → 저널 관망 마커/카드 → 복기까지 라벨 일관.
- 대상: `0003_*.sql`(신규), `discord-interactions/index.ts`, `monitor/index.ts`(버튼), `mvp/src/pages/{JournalPage,ReviewPage,HistoryPage}.jsx`.

### T4. 로그인 Discord 연결 UI
- 웹에서 `discord_links` 연결 흐름(연결 코드 발급/입력 또는 딥링크). 프로토타입 로그인의 'Discord 계정 연결' 버튼을 실기능으로.
- **수용 기준**: 웹에서 내 Discord 계정을 연결하면 알림이 내 채널로 도달.
- 대상: `mvp/src/pages/LoginPage.jsx`(또는 별도 설정 화면), Discord 연동 로직.

### T5. 알림 메모리 에이전트화 — **2주차 이후로 연기(결정 완료)**
- 현재 저장된 복기 조회 → **알림 문구를 에이전트가 생성**(관련 과거 복기 1줄 능동 연결). 기획 Should.
- 2주차 범위에서 제외. 현행(저장된 복기 조회) 그대로 유지.
- 대상(연기): `monitor/index.ts`(+ Gemini 호출).

### T6. (선택) 조건 종류 확장
- volume·이동평균 조합 등. 기획 Could.

## 4. 결정 사항 (확정)

1. **관망 = 1급 개념으로 채택.** "진입 안 함" 결정도 기록·복기 대상에 포함한다 → T3 확정 수행(스키마 변경 동반).
2. **관심종목 저장 = 신규 `watchlists` 테이블.** 고정/파생 방식은 채택하지 않음.
3. **알림 메모리 에이전트화(T5) = 2주차 이후로 연기.** 2주차는 현행(저장된 복기 조회) 유지.

## 5. 범위 밖 / 이후
- volume 조건, 주간 요약 리포트(기획 Could).
- 실제 주문 실행·체결 연동(기획 Non-goals).

---

> 이 문서는 1주차 말 조사(프로토타입 시나리오 vs MVP 코드 3영역 정독) 기준. 코드가 바뀌면 대조표를 갱신한다.
