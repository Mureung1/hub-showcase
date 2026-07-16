# Beacon 개발 실행 문서 — 상태 스냅샷 + 작업 백로그

> MVP 완주 이후의 실행 문서. **§1 현재 상태(실측)** 를 보고 **§2 백로그(WP)** 순서로 작업한다.
> 기획 원천은 [plan.md](plan.md), 구현 스펙은 [prd.md](prd.md), 디자인은 [design.md](design.md).
> 마지막 실측 검증: **2026-07-16** (WP-A 완료 시점 — 라이브 트리거·복기 생성 테스트 포함).

## 1. 현재 상태 스냅샷 (실측)

### 1.1 배포·데이터 (원격)

- **마이그레이션**: 로컬=원격 일치 — `0001_schema` / `0002_cron` / `0003_watchlists` / `0004_discord_link_and_profiles` / `0005_alerts_and_hold` / `0006_trade_fields_and_usage`.
  - `0004`(handle_new_user 트리거 + 기존 계정 백필 + discord_link_codes) **2026-07-16 적용** — 신규 가입 FK 실패 해소, 라이브 트리거 테스트 통과.
  - `0006`(trades.tags/emotion + ai_usage_events ledger) **2026-07-16 적용** — 라이브 insert·check 제약·기존 행 호환 검증 통과.
- **Edge Functions**: `market-data` · `monitor` · `discord-interactions` · `review-agent` **4종 전부 배포·ACTIVE**. review-agent는 라이브 복기 1건 생성 확인(2026-07-16).
- **시크릿**: KIS 2종 + `GEMINI_API_KEY` 등록 확인. ⚠️ `DISCORD_BOT_TOKEN`/`DISCORD_PUBLIC_KEY`/`DISCORD_APPLICATION_ID`는 **원격 미설정** — §1.3 참조.

### 1.2 웹앱 (로컬 코드)

- **라우트**: `/`(인증 인지형) · `/login` · `/dashboard` · `/watchlist` · `/conditions` · `/stock/:ticker` · `/review/:tradeId` · `/history` + `/journal*` 리다이렉트. `APP_HOME='/dashboard'`([src/lib/routes.js](../src/lib/routes.js)).
- **종목 페이지**(`StockPage`): KIS 실데이터 차트(년/월/주/일 인터벌, US 년봉 비활성) + 마커 4종 + 가격조건 수평선(`createPriceLine`) + `TradeForm` 컴포넌트(3-way 매수/매도/관망 + 태그 pill 다중선택 + 감정 칩 단일선택, 후보 상수 [src/lib/tradeMeta.js](../src/lib/tradeMeta.js)) + 조건 폼(`fixedSymbol`) + 관심 토글.
  - **`traded_at`은 아직 `now()` 고정**(과거 일자 입력 불가) — WP-C.
- **히스토리**(`HistoryPage`): 종목별 그룹 + 큰 블록 카드(메모 인라인 편집·복기 요청 버튼 내장 — 비대) — WP-E.
- **mock**: **전부 제거 완료**(2026-07-16, `lib/mockDashboard.js` 삭제) — 대시보드·관심종목 모두 항상 실데이터.
- **미구현**: `SettingsPage`(Discord 연동) · 차트 클릭 기록 · `/trade/:id` · `/condition/:id`.

### 1.3 알려진 결함·부채

- **Discord 함수 시크릿 원격 미설정**: 배포된 `discord-interactions`·`monitor`가 참조하는 `DISCORD_BOT_TOKEN`/`DISCORD_PUBLIC_KEY`/`DISCORD_APPLICATION_ID`가 원격 시크릿에 없음(로컬 `.env`에는 있음) → **원격 Discord 서명 검증·발송이 동작 불가 상태로 추정**. WP-G 착수 시(또는 그 전에) `supabase secrets set`으로 등록 필요.
- 알림의 "메모리 한 줄"은 저장된 복기 **조회** 방식(`monitor`의 `fetchMemoryLine`) — 에이전트 생성은 보류(§2 연기 항목).
- ~~신규 가입 계정에 `profiles` 행이 안 생김~~ → **해소**(`0004`, 2026-07-16). 라이브 테스트: 신규 계정 생성 → profiles 자동생성 → watchlists insert 성공 확인.

## 2. 작업 백로그 (Work Packages)

날짜가 아니라 **의존성 순서**로 관리한다. 각 WP는 독립 PR 단위를 지향.

```
WP-A(결함 해소) ─→ WP-B(기록 필드) ─→ WP-C(차트 클릭) ┐
                          │                          ├─→ WP-E(히스토리 카드) ─→ WP-H(E2E 검증)
                          └─→ WP-D(상세 라우팅) ──────┘
WP-A(A2) ─→ WP-F(review-agent 확장, WP-B 후)
WP-A(A1) ─→ WP-G(Discord 연동, 독립 병행 가능)
```

### WP-A. 기반 결함 해소 — ✅ 완료 (2026-07-16)

| # | 작업 | 결과 |
|---|------|------|
| A1 | `0004` 마이그레이션 작성·적용 | ✅ `0004_discord_link_and_profiles.sql` — `handle_new_user` 트리거 + 기존 계정 백필 + `discord_link_codes`(RLS own-row 4정책). 원격 적용 완료 |
| A2 | `review-agent` 배포 | ✅ `GEMINI_API_KEY` 시크릿 설정 → deploy → 라이브 복기 1건 신규 생성·`reviews` 저장 확인 |
| A3 | 대시보드 mock 해제 | ✅ mock 분기 제거 + `lib/mockDashboard.js` 삭제, lint/build 통과 |

**수용 기준 검증**: 신규 계정 생성 → profiles 자동생성 → watchlists insert 성공 ✅. 복기 요청 → `reviews` 행 생성 ✅. 단 `cited_trade_ids`는 빈 배열 — 대상 trade(066570)와 같은 종목 과거 기록이 0건이라 정당한 결과(환각 필터 정상 작동). 인용 비어있지 않음 검증은 동일 종목 기록이 쌓인 뒤 WP-H E2E에서 재확인.

### WP-B. 매매 기록 데이터 확장 (`0006`) — ✅ 완료 (2026-07-16)

| # | 작업 | 결과 |
|---|------|------|
| B1 | 마이그레이션 `0006_trade_fields_and_usage.sql` | ✅ `trades.tags text[] default '{}'` + `emotion` check(5종) + `ai_usage_events`(RLS select-own, insert는 service role). 원격 적용 |
| B2 | `TradeForm` 컴포넌트 추출 | ✅ `src/components/TradeForm.{jsx,css}` — insert 내장 + `onSaved` 콜백(ConditionForm 관례), `variant` prop 자리 확보(모달은 WP-C) |
| B3 | 태그·감정 입력 UI | ✅ 태그 pill 다중선택 + 감정 칩 단일선택(선택 사항), 상수 `src/lib/tradeMeta.js`(WP-E·F 재사용용) |

**수용 기준 검증**: RLS 경로(로그인 사용자)로 태그 2개+감정 1개 insert → 저장 확인 ✅. 허용 밖 emotion 거부(23514) ✅. 미선택 제출(`[]`/`null`) ✅. 기존 4행 `tags=[]`/`emotion=null` 호환 ✅.

### WP-C. 차트 클릭 → 과거 일자 기록 (선행: B2)

| # | 작업 | 내용 |
|---|------|------|
| C1 | `subscribeClick` 핸들러 | 클릭 봉의 time 취득 → `TradeForm` 모달을 해당 날짜·종가로 프리필 |
| C2 | 주/월/년봉 일자 선택 | 봉이 기간을 대표하므로 date input(min/max=봉 범위) 단계를 선행 후 폼 |
| C3 | `traded_at` 규칙 | 선택 일자의 장마감 시각(KR 15:30 KST / US 16:00 ET), `source='manual'` |

**수용 기준**: 일봉 클릭 → 그 날짜로 기록 → 차트 마커가 해당 봉 위에 표시. 주봉 클릭 → 일자 선택 → 기록.

### WP-D. 상세 페이지 라우팅 (선행: B2 · WP-C와 병행 가능)

| # | 작업 | 내용 |
|---|------|------|
| D1 | `/trade/:id` 신설 | 기록 전 필드 수정 + 삭제 + AI 복기 섹션(버튼→결과). 기존 `/review/:tradeId`(ReviewPage) 내용 **흡수 후 리다이렉트** |
| D2 | `/condition/:id` 신설 | 조건 operator/target/상태 수정 + 삭제(`ConditionForm` 변형 재사용) |
| D3 | 목록 클릭 연결 | 히스토리 카드·조건 관리 리스트 항목 클릭 → 각 상세로 이동 |

**수용 기준**: 히스토리에서 기록 클릭 → 상세에서 가격 수정·복기 요청 가능. `/review/:id` 구 링크가 `/trade/:id`로 이동.

### WP-E. 히스토리 소형 카드 그리드 (선행: B1 · D)

- 종목별 그룹 유지 + 그룹 내 **2열 카드 그리드(모바일 1열)**. 카드 표시 항목: side 라벨(관례색) · 날짜·가격(·수량) · 셋업 태그 pill(최대 3, +n) · 감정 칩 · 복기 상태 뱃지 · 삭제. 상세 스펙 [prd.md](prd.md) §7.
- 메모 인라인 편집·복기 요청 버튼은 카드에서 **제거**(→ 카드 클릭 시 `/trade/:id`).
- **수용 기준**: 한 종목 3건 이상일 때 그리드 정렬, 카드 클릭 → 상세 진입, 미복기/분석완료 뱃지 구분.

### WP-F. review-agent 확장 (선행: A2 · B1)

| # | 작업 | 내용 |
|---|------|------|
| F1 | tags/emotion 컨텍스트 | 대상 trade 컨텍스트 + `search_past_trades` 출력에 포함 → 태그·감정 기반 반복 패턴 인용 |
| F2 | 사용 이력 기록 | 복기 **신규 생성 성공 시만** `ai_usage_events(kind='review')` insert(캐시 반환·실패 시 미기록). 제한은 미적용(결정 8) |
| F3 | 재배포 | deploy + 라이브 복기 1건으로 F1·F2 확인 |

### WP-G. Discord 계정 연동 (선행: A1 · 독립 병행 가능)

| # | 작업 | 내용 |
|---|------|------|
| G1 | 셀프 연동 플로우 구현 | 설계 확정본 [discord-linking.md](discord-linking.md) 그대로: 신규 `SettingsPage`(코드 발급) + `/연동` 봇 커맨드 + `register-discord-command.mjs` 갱신 |
| G2 | 감시 함수 사용자별 조건 조회 | `getSingleUser` → `discord_user_id` 역조회 전환(discord-linking.md §7) — 다중 사용자 시 감시가 첫 계정에만 귀속되는 문제 해소 |
| G3 | 알림을 사용자별 Discord 채널로 발송 | `monitor`가 사용자별 순회로 각자의 `notify_channel_id`에 알림 발송(discord-linking.md §7) |

**수용 기준**: 웹에서 발급한 코드로 `/연동` → 알림이 내 채널로 도달. 계정이 2개 이상이어도 각자 자기 조건·자기 채널로만 알림 수신.

### WP-H. 라이브 E2E 검증 + 문서 마감

- 시나리오: 가입 → 대시보드 검색 → 종목 페이지(차트 인터벌·차트 클릭 기록·관심 토글·조건 설정) → Discord 알림·원클릭 기록 → 히스토리 카드 → `/trade/:id` 수정·복기 → `/condition/:id` 수정 → `ai_usage_events` 적재 확인.
- 본 문서 §1 스냅샷 갱신.

### 연기·보류

- **알림 메모리 에이전트화**(결정 3): 현행 유지(저장된 복기 조회). 이후 재검토.
- **조건 종류 확장**(volume 등, 기획 Could) · 주간 요약 리포트.

## 3. 결정 사항 (확정)

1. **관망 = 1급 개념.** "진입 안 함"도 기록·복기 대상 — 구현 완료(`0005`, 3-way).
2. **관심종목 저장 = 신규 `watchlists` 테이블** — 구현 완료(`0003`).
3. **알림 메모리 에이전트화 = 연기.** 현행(저장된 복기 조회) 유지.
4. **디자인 = 라이트 온리.** Stripe/Linear풍 + Geist 폰트 + 1152px 중앙 레이아웃. accent 인디고 `#635bff`, 국내 관례색(상승 빨강/하락 파랑) 유지. 원천 [design.md](design.md).
5. **홈 = 인증 인지형 `/`.** 진입점은 `APP_HOME` 상수 1곳.
6. **웹 조건 추가 = 구조화 폼.** 자연어 파싱(Gemini)은 Discord 전용.
7. **매매 기록 필드 = 경량형.** 기존 + **셋업 태그(다중)·감정 상태(단일)** 만 추가. 확신도·목표가/손절가 미채택(마찰 최소화). *(WP-B)*
8. **AI 복기 = 온디맨드 버튼 유지 + 사용량 ledger 기록만.** 자동 실행 아님, 횟수 제한 미적용 — 과금 모델 대비용. *(WP-B·F)*
9. **상세 화면 = 전용 페이지 라우트.** `/trade/:id`·`/condition/:id` 신설, `/review/:tradeId`는 흡수·리다이렉트. 모달 아님. *(WP-D)*
10. **차트 클릭 기록 = 팝업 폼.** 주/월/년봉은 일자 선택 단계 선행. *(WP-C)*

## 4. 범위 밖 / 이후

- volume 조건, 주간 요약 리포트(기획 Could).
- 실제 주문 실행·체결 연동(기획 Non-goals).

---

## 부록 A. 프로토타입 ↔ MVP 대조표 (2026-07-15 기준)

| # | 시나리오 | 상태 | 근거 |
|---|---|---|---|
| ① | 자연어 조건 입력 (Discord) | ✅ | `discord-interactions` `handleCommand` |
| ② | AI 파싱 확인 (확정/취소) | ✅ | `parseNaturalAlert`+확인 카드. DB엔 `disabled`로 선저장→확정 시 `active` |
| ③ | 감시 (Cron + KIS) | ✅ | `0002_cron` `*/5 * * * *` → `monitor`. price·sma_cross만 |
| ④ | 알림 + 복기 메모리 한 줄 | ✅ | `fetchMemoryLine`(조회 방식, LLM 생성 아님 — 결정 3) |
| ⑤ | 원클릭 기록 매수/매도/관망 | ✅ | `handleTrade` 3-way, `0005` 원격 적용 |
| ⑥ | 종목 페이지 (차트+인터벌+마커+기록+조건) | ✅ | `StockPage` 실데이터 동작 확인 |
| ⑦ | AI 복기 (도구 다단계 + 인용) | ✅ | `review-agent` 배포·라이브 복기 생성 확인 (WP-A A2, 2026-07-16) |
| ⑧ | 히스토리 완주 루프 | ✅ (개편 예정) | 현 큰 블록 카드 → WP-E 소형 그리드 |
| ➕ | 대시보드 / 관심종목 탭 / 웹 조건 폼 / 로그인·가입 | ✅ | §1.2 참조. Discord 연동 UI만 미착수(WP-G) |

## 부록 B. 작업 이력 (요약)

> 상세 서술이 필요하면 git log 참조. 여기는 흐름 파악용 한 줄 요약.

- **디자인 피벗 2회 → 확정**: Robinhood 다크 → Stripe/Linear 라이트+인디고 → Geist 폰트+1152px(라이트 온리). [design.md](design.md) v2 전면 재정비, `index.css` 토큰 동기화.
- **홈/IA 재편**: `ProjectIntro` 폐기 → 인증 인지형 `/`, `APP_HOME` 상수화.
- **대시보드 신설 + 재구성**: `/dashboard`(검색+관심종목+최근기록, `0003_watchlists`) → investment_journal풍 센터 히어로 검색+스크롤 리빌로 재구성, `Icon.jsx` 도입.
- **웹 조건 추가 폼**: `ConditionForm` 구조화 폼(`fixedSymbol`로 종목 페이지 전용).
- **로그인 스플릿 + 회원가입(signUp)** 추가. Discord 연동은 설계만([discord-linking.md](discord-linking.md)).
- **IA 재편**: `/stock/:ticker` 신설(차트+마커+기록폼+조건), `JournalPage` 삭제(기능은 종목 페이지+히스토리로 흡수), 조건 탭 조회 전용, 네비 3개, `/journal*` 리다이렉트.
- **관망(hold) + `alerts` 이력**(`0005`): 3-way 기록, Discord 관망 버튼, 조건 충족 시 `alerts` insert — 코드·배포·마이그레이션 완료.
- **관심종목 탭**(`/watchlist`) 신설 + `lib/quotes.js` 추출 + `toggleStar` `user_id` 누락 버그 수정 + 관심종목 mock 완전 제거(최근기록 mock만 유지).
- **첫 원격 배포**: `0003`·`0005` push, 함수 3종 deploy, `market-data` 실호출 확인(`review-agent` 미배포).
- **차트 실연결**: 차트 생성 `useEffect` 의존성 `[meta]` 수정(빈 차트 버그), 가격조건 `createPriceLine`, `0005` `drop constraint if exists` 하드닝.
- **차트 인터벌 년/월/주/일**: 대안 리서치 후 lightweight-charts+KIS 유지 확정. KR `FID_PERIOD_DIV_CODE`/US `GUBN`(년봉은 월봉 폴백), 일봉 100봉 제한 유지.
- **UI 정리**: 관심종목 국내/해외 분리(클라이언트 그룹핑), 로딩 문구 제거.
- **저장소 flatten**: npm workspaces(`mvp`+`prototype`) → 단일 앱 루트. `prototype/`·`mockups/` 삭제, 문서 경로 전부 갱신, `main` 반영.
