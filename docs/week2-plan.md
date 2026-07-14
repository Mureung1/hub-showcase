# Beacon 2주차 개발 계획 — 프로토타입 ↔ MVP 비교 + 태스크

> 1주차 산출물(동작 MVP ver1 + Robinhood 디자인 프로토타입)을 대조 평가하고,
> 2주차 개발을 **프로토타입 기준**으로 정렬하기 위한 실행 문서.
> 기획 원천은 [plan.md](plan.md), 디자인 원천은 [design.md](design.md).

## 0. 개요

- **MVP** ([mvp/](../mvp/)) — 감시→기록→복기 루프가 end-to-end 배선된 동작 버전. Supabase Edge Functions + Cron + KIS + Gemini.
- **프로토타입** ([prototype/](../prototype/)) — 목데이터 기반 비동작. 클린 SaaS 라이트 디자인(Stripe/Linear풍 + Geist 폰트) + 확정된 UX(대시보드·관망·Discord 경험 데모)의 UI 토대. *(디자인은 2주차 중 Robinhood 다크에서 라이트로 피벗 — §1.5·§4 참조.)*
- **2주차 목표(한 줄)**: 프로토타입에서 확정된 화면·디자인·UX를 MVP의 실배선 위에 올려, 프로토타입과 같은 경험을 실제 데이터로 동작하게 만든다.

## 1. 평가 결론

**MVP의 구현 방향은 옳다.** 서비스의 존재 이유인 "감시→기록→복기" 루프가 실제로 끝까지 배선돼 있고, 에이전트다움의 본체인 **AI 복기가 진짜 에이전트**로 구현돼 있다. 남은 간극은 대부분 *프로토타입이 원래 기획보다 앞서 추가한 항목*(관망·대시보드·웹 Discord연결)과 *디자인 미반영*이다.

### 잘 된 것 (유지)
- **AI 복기 = 진짜 에이전트**: `_shared/gemini.ts`의 `runAgentLoop`이 Gemini function-calling **다단계 루프**(최대 6회)로, `search_past_trades`·`get_price_context`·`get_past_reviews` **3종 도구를 모델이 스스로 호출**. 근거 수집 후 도구를 끈 채 structured output으로 최종화. → 1-shot 아님. (`mvp/supabase/functions/review-agent/index.ts`)
- **검증 가능성**: `cited_trade_ids`를 UUID·실존 여부로 **환각 필터링 후 저장**, 전체 transcript를 `reviews.raw`에 audit. 복기 출력(headline + timing/emotion/repeated_mistake)이 프로토타입 복기 화면과 정확히 일치.
- **다중사용자 전제**: 전 테이블 RLS(`auth.uid()=user_id`), `profiles`/`discord_links` 존재. (`0001_schema.sql`)
- **감시 파이프라인**: Cron 5분 주기 → `monitor` → KIS 시세 → price/sma_cross 평가 → edge-trigger 알림. 자연어 파싱(Gemini structured) + 확인 카드 + 원클릭 기록→`trades` insert.

## 1.5 진행 현황 (2026-07-14 업데이트)

2주차 착수 후 상황. 원래 계획(T1~) 대비 **디자인 방향이 두 차례 피벗**됐고, 몇몇 항목은 계획을 넘어 추가 구현됐다.

### 완료
- **T1 디자인 정합 — 완료(방향 변경).** Robinhood 다크+그린 → (1차) Stripe/Linear풍 **라이트+인디고** → (2차) `investment_journal`의 **Geist 폰트 + 1152px 중앙 레이아웃** 차용. **라이트 온리**. [design.md](design.md)를 v2로 전면 재정비(색·타이포/간격 스케일·컴포넌트 상태/폼·피드백·모션·접근성). 양쪽 `index.css` 토큰 동기화.
- **홈/IA 재편 (계획 외 추가).** `ProjectIntro` 폐기 → **인증 인지형 `/`**(로그아웃=`LandingPage`, 로그인=`APP_HOME` 리다이렉트). 내비 순서 대시보드→저널→히스토리→조건, 로고→`/`, 네비바 좌측 쏠림 해결(중앙 컨테이너).
- **T2 대시보드 — 코드 완료.** `/dashboard`(디바운스 종목검색 드롭다운 + 관심종목 + 최근기록), `/journal/:symbol`(트레이드 없는 종목도 `symbols` 조회로 차트), `lib/symbols.js`, `watchlists` 마이그레이션(`0003_watchlists.sql`, **적용 대기**). 진입점 `APP_HOME='/dashboard'`(`lib/routes.js` 1줄).
- **대시보드 레이아웃 재구성 — investment_journal 이식 (2026-07-14).** `/dashboard`를 참고 레포 `investment_journal` 대시보드처럼 재구성: 화면을 꽉 채우는 **센터 히어로 검색**(+"이동 →" 제출 버튼·Enter로 첫 결과 이동) → 아래로 스크롤하면 히어로가 흐려지며(scale·opacity·blur) **2단 카드 그리드(관심종목·최근기록)가 드러나는 스크롤 리빌**(700ms, `prefers-reduced-motion` 시 모션 제거). 관심종목은 세로 리스트 → **내부 2열 티커카드 그리드 + 새로고침 버튼**. 색은 investment_journal의 앰버/에메랄드/로즈를 이식하지 않고 **Beacon 토큰(인디고 accent + 국내 관례색 상승 빨강/하락 파랑)** 유지. 새 무의존성 인라인 SVG 아이콘 컴포넌트 `components/Icon.jsx`(lucide 경로 차용) 도입 → 네비바 로고 칩·링크에 아이콘 추가(라벨은 Beacon 것 유지). Supabase 쿼리 계약(`watchlists`/`trades`/`reviews`/`market-data`) 불변. 대상: `mvp/src/pages/DashboardPage.{jsx,css}`, `mvp/src/components/{AppLayout.jsx,AppLayout.css,Icon.jsx}`. 빌드·lint 통과(로그인 후 라이브 렌더는 사용자 확인 중).
- **웹 조건 추가 (계획 외 추가).** `ConditionForm` 구조화 폼(종목검색 → 타입/연산자/목표값 → `conditions` insert, `status=active`). 자연어 파싱(Gemini)은 Discord 전용 유지. IA 재편 이후 이 폼은 종목 페이지(`/stock/:ticker`) 전용(`fixedSymbol`)으로 이동.
- **로그인 UI 완성 + 회원가입 추가 (2026-07-14).** `LoginPage` 스플릿(좌 브랜드 패널 + 우 폼)으로 재구성, `signUp` 추가(로그인/가입 탭 토글), 비번 show/hide, 로그인 후 리다이렉트는 **항상 `APP_HOME`**(원래 목적지 복귀 제거, `ProtectedRoute`의 `state.from` 전달도 정리). Discord 연동은 **설계 문서만** 작성 — [discord-linking.md](discord-linking.md) 참조.
- **IA 재편: 종목 페이지 신설 + 히스토리 통합 + 조건 조회 전용 (2026-07-14).** 대시보드 검색·관심종목·미복기 최근기록 클릭이 저널 자동이동 대신 신설 **`/stock/:ticker`**(차트+마커4종+관심토글+매매기록폼+조건설정+이 종목 기록/조건 리스트)로 이동. 구 저널(`JournalPage`)은 **삭제**, 그 기능(차트·메모 편집·복기 요청)은 종목 페이지와 **히스토리 탭**(통합: 완주 루프 체인 + 메모 인라인 편집 + AI 복기 요청 버튼)으로 흡수. 조건 관리 탭은 **조회 전용**(종목별 그룹 + 상태 뱃지 + 삭제만, 추가 폼 제거 — 추가는 종목 페이지에서). 네비 4개(대시보드/저널/히스토리/조건)→**3개**(대시보드/히스토리/조건 관리). `/journal`·`/journal/:symbol`은 `/history`·`/stock/:ticker`로 리다이렉트(하위 호환).
  - 차트 마커 4종: 매수▲/매도▼/관망●(hold색) + 조건 설정■(accent) + **조건 충족●(accent-2)**. 마지막 것은 지금까지 없던 **`alerts` 이벤트 이력 테이블**이 원천(아래 신규 마이그레이션).
  - 대상: 신규 `mvp/src/pages/StockPage.{jsx,css}`, `mvp/src/components/ConditionForm.css`(신규, `.cf*` 분리), 수정 `HistoryPage.{jsx,css}`·`ConditionsPage.{jsx,css}`·`ConditionForm.jsx`(`fixedSymbol` prop)·`DashboardPage.jsx`·`ReviewPage.jsx`·`AppLayout.jsx`·`App.jsx`·`ProtectedRoute.jsx`. 삭제 `JournalPage.{jsx,css}`.
- **T3 관망(hold) — 프론트+백엔드 코드 완료, 마이그레이션 적용 대기.** `trades.side` check에 `'hold'` 추가 + **신규 `alerts` 테이블**(조건 충족 이력)을 `0005_alerts_and_hold.sql`로 작성. `monitor`에 관망 버튼(`bcn|trade|hold|...`) + 조건 충족 시 `alerts` insert 추가, `discord-interactions`의 `handleTrade`가 `hold` 허용 + 3-way `sideLabel`. 웹은 종목 페이지 매매기록 폼이 처음부터 3-way(매수/매도/관망)로 구현됨.
- **히스토리 종목별 그룹 (계획 외 추가).** 그룹 헤더 "차트 보기" → `/stock/:ticker`(IA 재편으로 경로 변경).
- **대시보드 mock 데이터 + 관심종목 탭 신설 (2026-07-14).** `watchlists`·`trades` 원격 미적용 상태라 대시보드가 비어 스크롤 리빌 애니메이션을 확인할 수 없었음 → 신규 `lib/mockDashboard.js`(플래그 `USE_MOCK_DASHBOARD` 1개로 온오프, 완전 제거도 파일 삭제+주석 블록 삭제만 하면 됨)로 관심종목 6종·최근기록 6건 mock 도입. **실데이터가 하나라도 있으면 자동으로 실데이터 우선**(대시보드·관심종목 탭 동일 로직). 겸사겸사 `DashboardPage`의 `fetchQuote`/`formatPrice`/`symbolKey`를 신규 `lib/quotes.js`로 추출(중복 제거, 관심종목 탭과 공유). 신설 **관심종목 탭**(`/watchlist`, 네비 대시보드 다음)은 `watchlists` 테이블을 시세 카드 그리드로 조회 — 종목 페이지 ⭐·대시보드 관심종목과 **같은 테이블을 공유해 연동**(탭 이동 시 최신 반영). 이 작업 중 **버그 발견·수정**: `StockPage`의 `toggleStar` insert가 `user_id`를 빠뜨려 `watchlists`(NOT NULL + RLS)에 실제로 저장되지 않고 있었음 — `supabase.auth.getUser()`로 채우도록 수정. 대상: 신규 `mvp/src/lib/{mockDashboard,quotes}.js`, `mvp/src/pages/WatchlistPage.{jsx,css}`, 수정 `DashboardPage.jsx`·`StockPage.jsx`·`AppLayout.jsx`·`App.jsx`. 빌드·lint 통과.

### 남은 일
- **`0003_watchlists.sql` + `0005_alerts_and_hold.sql` Supabase 적용** — 미적용 시 대시보드·관심종목 탭 관심종목·웹 조건 저장·관망 기록·조건 충족 마커가 실동작하지 않음(단, `alerts` insert 실패는 `monitor`가 로그만 남기고 알림 발송 자체는 막지 않도록 방어함). 미적용 상태에선 대시보드·관심종목 탭이 mock 데이터로 폴백해 레이아웃만 확인 가능.
- **대시보드 mock 데이터 제거** — `0003` 적용 후 실데이터가 채워지면 `lib/mockDashboard.js`의 `USE_MOCK_DASHBOARD=false`로 끄거나 파일+참조 삭제.
- **T4 로그인 Discord 연결 UI 실구현** — 설계는 확정([discord-linking.md](discord-linking.md)), 코드(마이그레이션 `0004`·봇 커맨드·`SettingsPage`)는 미착수.
- **라이브 end-to-end 검증** — 로그인 세션에서 대시보드 검색→종목 페이지 차트·관심토글·매매기록(3-way)·조건설정, 히스토리 메모편집·복기요청, 조건관리 조회, `/journal` 리다이렉트 확인(현재 빌드·lint까지만 확인됨).
- (연기) T5 알림 메모리 에이전트화 · (선택) T6 조건 종류 확장.

## 2. 프로토타입 ↔ MVP 대조표

| # | 프로토타입 시나리오 | MVP 상태 | 근거 |
|---|---|---|---|
| ① | 자연어 조건 입력 (Discord) | ✅ 구현 | `discord-interactions` `handleCommand`가 `내용` 옵션 파싱 |
| ② | AI 파싱 확인 (확정/취소) | ✅ 구현 | `parseNaturalAlert`+`NATURAL_ALERT_SCHEMA`, `buildConfirmCardPayload`. 단 DB엔 `disabled`로 먼저 저장→확정 시 `active` |
| ③ | 감시 (Cron + KIS) | ✅ 구현 | `0002_cron.sql` `*/5 * * * *` → `monitor`. **price·sma_cross만** (volume 없음) |
| ④ | 알림 + 과거 복기 메모리 한 줄 | ✅ 구현 | `monitor` `fetchMemoryLine`이 `reviews` 조회 → embed. **알림 시점 LLM 생성은 아님** |
| ⑤ | 원클릭 기록 매수/매도/**관망** | ✅ 코드 완료 | `handleTrade` hold 허용 + `monitor` 관망 버튼, `trades.side check` 3-way(`0005`) **적용 대기** |
| ⑥ | 웹 종목 페이지 (차트+마커+기록+조건) | ✅ 구현 | `StockPage`(`/stock/:ticker`) 차트+매수/매도/관망/조건설정/조건충족 5종 마커+매매기록폼+조건설정+메모. 조건충족 마커는 `alerts`(`0005`) **적용 대기** |
| ⑦ | AI 복기 (도구 다단계 + 과거 인용) | ✅✅ 일치 | `review-agent` 에이전트 루프, `ReviewPage` 3셀+인용 |
| ⑧ | 히스토리 완주 루프 (+메모편집·복기요청 흡수) | ✅ 구현 | `HistoryPage` 조건→기록→복기 체인, 완주 카운트, 메모 인라인 편집, AI 복기 요청 버튼(구 저널 기능 흡수) |
| ➕ | 대시보드 (종목검색/관심종목/최근기록) | ✅ 코드 완료 | `DashboardPage`+`/stock/:ticker`+`lib/symbols.js`. `watchlists`(`0003`) **적용 대기** |
| ➕ | 웹 종목검색 → 조건 추가 | ✅ 코드 완료 | `ConditionForm`(`fixedSymbol`) → 종목 페이지 전용, `conditions` insert. 조건 관리 탭은 조회 전용으로 분리 |
| ➕ | 로그인 화면 Discord 연결 | ⚠️ 설계만 | `LoginPage`는 스플릿+로그인/가입. Discord 연동은 [discord-linking.md](discord-linking.md) 설계 확정, 코드는 미착수 (T4) |
| ➕ | 디자인 | ✅ 반영 | 라이트 Stripe/Linear풍 + Geist 폰트 + 1152px 중앙 레이아웃. 양쪽 `index.css` 동기화 |

## 3. 2주차 개발 태스크

우선순위: **T1 → T2 → T3 → T4 → 선택(T6, T5는 2주차 이후로 연기)**.

> 결정 완료(§4): ① 관망은 1급 개념으로 채택 → T3 확정 수행. ② 관심종목은 신규 `watchlists` 테이블. ③ 알림 메모리 에이전트화(T5)는 2주차 이후로 연기.

### T1. 디자인 정합 (최우선) — ✅ 완료 (방향 변경)
MVP 웹을 프로토타입 디자인 시스템으로 재정렬.
- **최종 방향은 라이트**: Robinhood 다크 계획에서 Stripe/Linear풍 라이트+인디고 → `investment_journal`의 Geist 폰트·1152px 레이아웃으로 정착(라이트 온리).
- `index.css` 토큰 교체(변수 이름 유지) + 공용 컴포넌트 클래스 이식(`.card/.btn/.pill/.badge/.status/.caption/.brand`). 하드코딩 색 제거.
- **수용 기준(갱신)**: MVP 전 화면이 라이트(인디고 accent)로 렌더, `beacon-design` 스킬 체크리스트 통과. 국내 관례색(상승 빨강/하락 파랑) 유지.
- 대상: `mvp/src/index.css`, `mvp/src/pages/*.css`, `mvp/src/components/*`, `main.jsx`(폰트).

### T2. 대시보드 신설 — ✅ 코드 완료 (`watchlists` 적용 대기)
프로토타입 `DashboardPage`를 실데이터로 이식.
- `/dashboard` 라우트 추가, 로그인 후 진입점 `/journal`→`/dashboard` (`LoginPage`·`App.jsx`).
- 종목검색 = `symbols` trigram 검색(RPC 또는 `ilike`), 관심종목 = `market-data` 시세, 최근기록 = `trades`.
- **수용 기준**: 검색→저널 이동, 관심종목 시세 카드, 최근기록 카드가 실데이터로 동작.
- 참고: `prototype/src/pages/DashboardPage.jsx`, `prototype/src/mock/symbols.js`.
- **관심종목 저장 = 신규 `watchlists` 테이블**(결정 완료). 컬럼: `id, user_id, symbol, market, exchange, created_at` + `unique(user_id, symbol)`. RLS는 기존 테이블과 동일하게 `auth.uid()=user_id`. 대시보드는 이 테이블 조회 + `market-data`로 시세 붙임.

### T3. 관망(hold) + 조건 충족 이력 반영 — **코드 완료, 적용 대기**
"진입 안 함"도 기록·복기 대상에 포함한다(1급 개념). 겸사겸사 차트 "조건 충족 시점" 마커에 필요한 이벤트 이력 테이블도 함께 추가(IA 재편 §1.5에서 요구).
- 마이그레이션 `0005_alerts_and_hold.sql`(작성 완료, 미적용 — `0003`=watchlists, `0004`=discord 연동 설계 선점): `trades.side` check에 `'hold'` 추가 + 신규 `alerts` 테이블(`user_id, condition_id, ticker, market, price, triggered_at`, RLS select-own).
- 디스코드: 알림에 관망 버튼(`custom_id: bcn|trade|hold|{condition_id}|{price}`), `handleTrade`가 hold 허용 + `sideLabel` 3-way. `monitor`가 알림 발송 성공 시 `alerts` insert(0005 미적용 환경에서도 알림 자체는 계속되도록 실패를 삼킴).
- 웹: 종목 페이지(`/stock/:ticker`) 매매기록 폼이 처음부터 3-way(매수/매도/관망), 차트 마커도 관망(원, hold색)·조건설정(사각, accent)·조건충족(원, accent-2) 포함. 히스토리 라벨도 3-way.
- **수용 기준**: Discord/웹 관망 기록 → `trades`(side=hold) → 종목 페이지 관망 마커/히스토리 카드 → 복기까지 라벨 일관. 조건 충족 시 `alerts` 행 생성 → 종목 페이지에 조건충족 마커 표시.
- 대상: `0005_alerts_and_hold.sql`, `discord-interactions/index.ts`, `monitor/index.ts`(버튼+alerts insert), `mvp/src/pages/{StockPage,ReviewPage,HistoryPage}.jsx`.

### T4. 로그인 Discord 연결 UI — **설계 확정([discord-linking.md](discord-linking.md))**
- 웹에서 `discord_links` 연결 흐름 = **연동 코드 방식**으로 확정. 웹(설정 화면)에서 코드 발급 → Discord `/연동 코드` 봇 커맨드 → 봇이 `discord_user_id`+`notify_channel_id` 저장. 상세 설계·마이그레이션(`0004`, `handle_new_user` 트리거 + `discord_link_codes`)·핸들러·미해결 결정거리는 **[discord-linking.md](discord-linking.md)** 참조.
- 선행 완료: 로그인 UI 스플릿 재구성 + **회원가입 추가**(`signUp`). 설정 화면(`/settings`)은 실구현 차례에 신설.
- **수용 기준**: 웹에서 내 Discord 계정을 연결하면 알림이 내 채널로 도달.
- 대상: `0004` 마이그레이션·`discord-interactions`·`register-discord-command.mjs`·신규 `SettingsPage`·`App.jsx`·`AppLayout`.
- ⚠️ 후속: 다중 사용자 시 `getSingleUser` → `discord_user_id` 역조회 전환 필요(discord-linking.md §7).

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
4. **디자인 = 라이트 온리로 피벗(확정).** Robinhood 다크 → Stripe/Linear풍 라이트 → `investment_journal`의 Geist 폰트·1152px 레이아웃 차용. 브랜드 accent = 인디고 `#635bff`, 국내 관례색 유지. 다크모드 미지원.
5. **홈 = 인증 인지형 `/` 채택.** `ProjectIntro` 폐기, 진입점은 `APP_HOME`(현 `/dashboard`) 상수 1곳으로 관리.
6. **웹 조건 추가 = 구조화 폼.** 자연어 파싱(Gemini)은 Discord 전용 유지, 웹은 종목검색 기반 폼.

## 5. 범위 밖 / 이후
- volume 조건, 주간 요약 리포트(기획 Could).
- 실제 주문 실행·체결 연동(기획 Non-goals).

---

> 이 문서는 1주차 말 조사(프로토타입 시나리오 vs MVP 코드 3영역 정독) 기준. 코드가 바뀌면 대조표를 갱신한다.
