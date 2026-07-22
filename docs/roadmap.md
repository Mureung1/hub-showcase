# Beacon 개발 실행 문서 — 상태 스냅샷 + 작업 백로그

> MVP 완주 이후의 실행 문서. **§1 현재 상태(실측)** 를 보고 **§2 백로그(WP)** 순서로 작업한다.
> 기획 원천은 [plan.md](plan.md), 구현 스펙은 [prd.md](prd.md), 디자인은 [design.md](design.md).
> 마지막 갱신: **2026-07-21** (G2/G3 멀티유저 라우팅 코드 착지 + 문서 정합화).

> **2026-07-20~21 요약**: 단일 사용자 라이브 완주(G0·G1·H1) 검증 완료 → `0007` "거울 프레임" 피벗(투자 계획 필드 + review-agent 재설계 + `repeated_mistake`→`behavior_pattern`) → **G2/G3 멀티유저 라우팅 코드 착지**(`resolveUserByDiscordId` + `monitor` 사용자별 순회, `0008` 인덱스 초안). **원격 배포·멀티유저 라이브 E2E는 다음 배포 세션으로 이연.**

## 1. 현재 상태 스냅샷 (실측)

### 1.1 배포·데이터 (원격)

- **마이그레이션**: `0001`~`0006` 원격 적용 완료. **`0007_plan_fields_and_mirror_review`(계획 필드 + reviews 개편)·`0008_multiuser_indexes`(초안)는 원격 push 이연** — 다음 배포 세션.
  - `0004`(handle_new_user 트리거 + discord_link_codes) 적용 — 신규 가입 FK 해소.
  - `0006`(trades.tags/emotion + ai_usage_events ledger) 적용.
  - `0007`(trades.thesis/target_price/stop_price/horizon/confidence + reviews.plan_adherence + repeated_mistake→behavior_pattern) — **코드 커밋(2026-07-20), 원격 push·검증 이연**.
- **Edge Functions**: `market-data` · `monitor` · `discord-interactions` · `review-agent` 배포·ACTIVE. **단, G2/G3 라우팅 + 0007 거울 프레임 반영본은 재배포 이연**(로컬 코드가 앞서 있음).
- **시크릿**: KIS 2종 + `GEMINI_API_KEY` 등록. Discord 3종(`DISCORD_BOT_TOKEN`/`DISCORD_PUBLIC_KEY`/`DISCORD_APPLICATION_ID`)은 G0 프로비저닝(3주차 Day1)으로 원격 설정 — 단일 사용자 라이브 완주 검증됨.

### 1.2 웹앱 (로컬 코드)

- **라우트**: `/`(인증 인지형) · `/login`(+Discord 연동 온보딩) · `/dashboard` · `/watchlist` · `/conditions` · `/stock/:ticker` · `/trade/:id` · `/condition/:id` · `/history` · `/settings`(Discord 셀프 연동) + `/journal*`·`/review/:tradeId` 리다이렉트. `APP_HOME='/dashboard'`([src/lib/routes.js](../src/lib/routes.js)).
- **종목 페이지**(`StockPage`): KIS 실데이터 차트(년/월/주/일 인터벌, US 년봉 비활성) + 마커 4종 + 가격조건 수평선(`createPriceLine`) + `TradeForm` 컴포넌트(3-way 매수/매도/관망 + 태그 pill 다중선택 + 감정 칩 단일선택, 후보 상수 [src/lib/tradeMeta.js](../src/lib/tradeMeta.js)) + 조건 폼(`fixedSymbol`) + 관심 토글.
  - 차트 클릭 → `TradeForm` 모달(일봉=날짜 고정, 주/월/년봉=date input min/max 게이트)로 과거 일자 기록 가능. `traded_at`=선택일 장마감(KR 15:30 KST / US 16:00 ET DST 인식), `source='manual'`. 인라인 폼은 기존대로 `now()`.
- **히스토리**(`HistoryPage`): 종목별 그룹 + 소형 카드 2열 그리드(모바일 1열) — side 뱃지·태그 pill·감정 칩·복기 상태 뱃지·삭제. 편집·복기는 카드 클릭 → `/trade/:id`.
- **mock**: **전부 제거 완료**(2026-07-16, `lib/mockDashboard.js` 삭제) — 대시보드·관심종목 모두 항상 실데이터.
- **Discord 연동(G1)**: `SettingsPage` + `DiscordLinkPanel`(코드 발급/복사/확인/해제) + 로그인 온보딩 + `/연동` 봇 커맨드 + 벌크 커맨드 등록 스크립트 — **코드 완료**(2026-07-20).
- **투자 계획 필드·거울 프레임(0007)**: `TradeForm`/`TradeDetailPage` 계획 필드 입력·수정, `review-agent` 거울 프레임 프롬프트·`plan_adherence`/`behavior_pattern` 출력 — **코드 완료**(2026-07-20).

### 1.3 알려진 결함·부채

- ⚠️ **로컬 코드가 원격보다 앞섬(배포 지연)**: G2/G3 라우팅 + `0007` 거울 프레임이 로컬에만 있음. `0007`·`0008` push + 함수 3종(`monitor`·`discord-interactions`·`review-agent`) 재배포 전까지 **원격은 여전히 단일 사용자·구 복기 스키마**로 동작. → 다음 배포 세션 최우선.
- 알림의 "메모리 한 줄"은 저장된 복기 **조회** 방식(`monitor`의 `fetchMemoryLine`, 현재 `behavior_pattern` 우선) — 에이전트 생성은 보류(§2 연기 항목).
- ~~Discord 함수 시크릿 원격 미설정~~ → **해소**(G0 프로비저닝, 3주차 Day1).
- ~~신규 가입 계정에 `profiles` 행이 안 생김~~ → **해소**(`0004`, 2026-07-16).

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

### WP-C. 차트 클릭 → 과거 일자 기록 — ✅ 완료 (2026-07-16)

| # | 작업 | 결과 |
|---|------|------|
| C1 | `subscribeClick` 핸들러 | ✅ 클릭 봉 time → `TradeForm` 모달(오버레이, Esc 닫기), 날짜·종가 프리필. 봉 없는 지점 클릭 무시 |
| C2 | 주/월/년봉 일자 선택 | ✅ 단일 모달 안 date input(min/max=봉 커버 범위, 기본값=기간 시작일) — 별도 위저드 대신 폼 상단 배치 |
| C3 | `traded_at` 규칙 | ✅ KR 15:30 KST 고정 / US 16:00 ET(Intl 기반 DST 인식, 실패 시 EST 폴백), `source='manual'` |

**수용 기준 검증(라이브)**: 일봉 클릭 → 모달 날짜·종가(2026-06-01, 380500) KIS 실데이터와 정합 ✅. 주봉 클릭 → date input min/max=해당 주(07-07~07-13) ✅. 모달 제출 → `traded_at=2025-07-09 15:30 KST`·`source='manual'` 저장 ✅ (검증 행 정리함).

### WP-D. 상세 페이지 라우팅 — ✅ 완료 (2026-07-16)

| # | 작업 | 결과 |
|---|------|------|
| D1 | `/trade/:id` 신설 | ✅ `TradeDetailPage` — 전 필드 수정(side/price/quantity/traded_at/memo/tags/emotion) + 삭제 + ReviewPage 복기 섹션 흡수. `/review/:tradeId` → 리다이렉트, ReviewPage 삭제 |
| D2 | `/condition/:id` 신설 | ✅ `ConditionDetailPage` — `ConditionForm` edit 모드(`editCondition`/`onUpdated`/`onDeleted` prop) 재사용, 상태(감시 중/대기) 선택 포함 |
| D3 | 목록 클릭 연결 | ✅ 히스토리 카드·조건 리스트 클릭 → 각 상세(내부 버튼 stopPropagation). 대시보드 최근기록 링크도 `/trade/:id` 직결 |

**수용 기준 검증(라이브)**: 히스토리 카드 클릭 → 상세 진입 ✅ → 가격 수정 → DB 반영 확인(원복함) ✅. 복기 섹션에 기존 복기 표시 ✅. `/review/:id` 접속 → `/trade/:id` 리다이렉트 ✅. 조건 상세 프리필(목표가 1,000,000) ✅.

### WP-E. 히스토리 소형 카드 그리드 — ✅ 완료 (2026-07-16)

- ✅ 종목별 그룹 + 2열 카드 그리드(720px 이하 1열). 카드: side 뱃지(관례색) · 날짜·가격(·수량) · 태그 pill(최대 3, +n) · 감정 칩 · 미복기/분석완료 뱃지 · 삭제(confirm). 인라인 메모 편집·복기 버튼·3-step 체인 제거(→ `/trade/:id`). "완주 루프" 요약 카운트는 유지.
- **수용 기준 검증(라이브)**: RKLB 3건 그리드(1280px→2열 550px×2, 673px→1열) ✅, 분석완료/미복기 뱃지 구분 ✅, 카드 클릭 → 상세 ✅.

### WP-F. review-agent 확장 — ✅ 완료 (2026-07-16)

| # | 작업 | 결과 |
|---|------|------|
| F1 | tags/emotion 컨텍스트 | ✅ 대상 trade + `search_past_trades` 출력에 tags/emotion(한국어 병기) 포함, 도구 설명·시스템 프롬프트에 태그·감정 반복 패턴 지시 추가 |
| F2 | 사용 이력 기록 | ✅ reviews insert 성공 직후만 `ai_usage_events` insert. 캐시·실패 경로 미기록, insert 실패는 로그만(응답 무영향) |
| F3 | 재배포 | ✅ deploy + 라이브 복기 1건: `cited_trade_ids` 1건 인용(비어있지 않음 — WP-A 이연 검증 해소) · usage 0→1 적재 · 캐시 재호출 시 미기록 확인 |

### WP-G. Discord 계정 연동 + 멀티유저 라우팅

| # | 작업 | 결과 |
|---|------|------|
| G0 | Discord 시크릿 원격 프로비저닝 | ✅ 3주차 Day1 — `supabase secrets set` 3종 |
| G1 | 셀프 연동 플로우 구현 | ✅ 2026-07-20 — `SettingsPage`+`DiscordLinkPanel`(코드 발급) + 로그인 온보딩 + `/연동` 봇 커맨드 + 벌크 커맨드 등록 스크립트 |
| G2 | 인터랙션 사용자별 해석 | ✅ 코드(2026-07-21) — `resolveUserByDiscordId`(`discord_user_id` 역조회) 신설, `getSingleUser` 제거. `/알림`·매매버튼 미연동 시 `/연동` 안내. **재배포 이연** |
| G3 | 알림 사용자별 채널 발송 | ✅ 코드(2026-07-21) — `monitor` 사용자별 `notify_channel_id` 맵 순회. 미연동은 평가·`alerts`만, 발송 스킵. **재배포 이연** |

**수용 기준**: 웹 발급 코드로 `/연동` → 알림이 내 채널로 도달. 계정 2개 이상이어도 각자 자기 조건·자기 채널로만 수신. → **원격 재배포 후 멀티유저 라이브 E2E로 검증 예정**(WP-H).

### WP-I. 거울 프레임 피벗 (`0007`) — ✅ 코드 완료 (2026-07-20)

자본시장법 경계(투자자문·유사투자자문 회피) 안에서 AI 복기를 "매매 추천"이 아닌 "계획 대비 실행을 비추는 거울"로 재정의. 근거·원칙은 [plan.md](plan.md) 서비스 원칙 섹션.

- **기록 폼**: `trades`에 진입 계획 필드 5종(`thesis`·`target_price`·`stop_price`·`horizon`·`confidence`, 전부 선택) 추가 — `TradeForm`/`TradeDetailPage`.
- **복기 스키마**: `reviews.plan_adherence` 신설 + `repeated_mistake`→`behavior_pattern` rename. `review-agent` 프롬프트에 미래지시·가치평가·결과론 금지 가드레일.
- **이연**: 면책 고지 상시 노출(AppLayout/복기 카드/알림/랜딩)은 일부만 반영 — 배포 세션에서 점검.

### WP-H. 배포 세션 — 원격 반영 + 라이브 E2E + 문서 마감 (다음 세션, supabase CLI 직접 실행)

1. **원격 배포**: `0007`·`0008` `db push` + 함수 3종(`monitor`·`discord-interactions`·`review-agent`) 재배포. `supabase migration list`로 `0007` 미적용 여부 먼저 확인.
2. **거울 프레임 라이브 검증**: 복기 재생성 → 미래지시·종목평가·결과론 문구 없음 + `plan_adherence` 생성. 계획 미기록 trade면 "계획 미기록" 지적.
3. **멀티유저 라이브 E2E**: 계정 2개 각자 Discord 연동 → 각자 조건 → `monitor` 트리거 → **각자 자기 채널로만** 알림 → 버튼 기록이 자기 `user_id`로 귀속 → 웹 상호 데이터 비노출(RLS).
4. **단일 사용자 회귀**: 가입 → 검색 → 종목 페이지(차트·클릭 기록·관심·조건) → 알림·원클릭 기록 → 히스토리 → `/trade/:id` 수정·복기 → `ai_usage_events` 적재.
5. 본 문서 §1 스냅샷 + Notion 3주차 보드 갱신.

### 연기·보류

- **알림 메모리 에이전트화**(결정 3): 현행 유지(저장된 복기 조회). 이후 재검토.
- **조건 종류 확장**(volume 등, 기획 Could) · 주간 요약 리포트.

## 3. 결정 사항 (확정)

1. **관망 = 1급 개념.** "진입 안 함"도 기록·복기 대상 — 구현 완료(`0005`, 3-way).
2. **관심종목 저장 = 신규 `watchlists` 테이블** — 구현 완료(`0003`).
3. **알림 메모리 에이전트화 = 연기.** 현행(저장된 복기 조회) 유지.
4. **디자인 = 라이트 온리.** Stripe/Linear풍 + 1152px 중앙 레이아웃. 폰트: 본문·제목 Pretendard(한국어 UI 표준) + 숫자·티커 Geist Mono. accent 인디고 `#635bff`, 국내 관례색(상승 빨강/하락 파랑) 유지. 원천 [design.md](design.md).
5. **홈 = 인증 인지형 `/`.** 진입점은 `APP_HOME` 상수 1곳.
6. **웹 조건 추가 = 구조화 폼.** 자연어 파싱(Gemini)은 Discord 전용.
7. **매매 기록 필드.** WP-B: 기존 + 셋업 태그(다중)·감정 상태(단일). **`0007`에서 진입 계획 필드(thesis·target_price·stop_price·horizon·confidence, 전부 선택) 추가** — 거울 프레임의 `plan_adherence` 축 전제. (초기 "확신도·목표가/손절가 미채택"은 번복.) *(WP-B·WP-I)*
8. **AI 복기 = 온디맨드 버튼 유지 + 사용량 ledger 기록만.** 자동 실행 아님, 횟수 제한 미적용 — 과금 모델 대비용. *(WP-B·F)*
9. **상세 화면 = 전용 페이지 라우트.** `/trade/:id`·`/condition/:id` 신설, `/review/:tradeId`는 흡수·리다이렉트. 모달 아님. *(WP-D)*
10. **차트 클릭 기록 = 팝업 폼.** 주/월/년봉은 일자 선택 단계 선행. *(WP-C)*
11. **AI 복기 = "거울 프레임".** 자본시장법 경계상 AI는 매매 추천·종목 가치평가·미래 지시·결과론 판정을 하지 않고, 사용자 **자신의 과거 행동**을 계획 대비/감정/반복 패턴으로 사실 서술한다. 원칙·법적 근거는 [plan.md](plan.md). *(WP-I, `0007`)*

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
