# Beacon 작업 체크리스트

> 체크 상태 실측 갱신: **2026-07-15** (코드 + 원격 배포 상태 기준).
> 새 작업은 여기에 추가하지 않는다 — 백로그는 [week2-plan.md](week2-plan.md) §2 (WP-A ~ WP-H)가 단일 원천.

## 0단계 — 착수 전 확인 (docs/prd.md §10)

원본 두 레포에 근거해야 하는 항목. 아래를 먼저 확인·확정한 뒤 1단계를 시작한다.

- [x] KIS 엔드포인트/TR ID·OAuth 토큰 흐름 확인 → Deno/TS로 포팅 (`KIS_openapi`의 `kis_alert_bot/`, `main.py`) — 토큰·엔드포인트 4종·스로틀·SMA 크로스 로직 확인 완료 → [docs/research.md](research.md) §1–§5 참조
- [x] 종목 마스터 데이터 포맷 확인 (`KIS_openapi/web/data/symbols/`) — `{market, exchange, ticker, name, source}` 배열(kr 3,577건/us 8,637건), DB `symbols` 테이블로 시드 결정 → research.md §7
- [x] `investment_journal`의 차트/마커 구현·실제 DB 스키마 확인 — lightweight-charts v5(`chart.addSeries(CandlestickSeries, ...)`), 마커는 네이티브 `createSeriesMarkers`로 대체, DB는 PRD §2 분리 스키마 유지 → research.md §10
- [x] KIS 일봉 히스토리 깊이가 `get_price_context`에 충분한지 확인 — window_days=10에는 충분. SMA 20/60 완전 지원, 240/480은 1회 ~100행 캡 가능성 있어 실측 후 확정 → research.md §4
- [x] Gemini 호출 방식(Deno REST 등) 확정 — SDK 없이 raw REST fetch(`generativelanguage.googleapis.com`, `responseJsonSchema`)로 확정, Deno 그대로 동작 → research.md §8
- [x] Discord 앱 설정 및 시크릿 준비 — Ed25519 검증(crypto.subtle)·defer 후 PATCH·bot 토큰 채널 POST·custom_id 파이프 인코딩·커맨드 등록 API 확인 완료(시크릿 발급은 체크포인트 2에서) → research.md §9
- [x] 감시 중복 방지 상태(원본 `last_alerts.json` 역할) 저장 방식 확정 — `conditions.last_matched`/`last_alerted_at` 컬럼 + edge-trigger 알림, `delete_after_alert=true`면 `status='done'` → research.md §6

## 1단계 — MVP (1인용)

### 통합 기반

- [x] 통합 웹앱 골격 신규 구축 (Vite + React SPA) — 라우트 전체 배선 완료, [week2-plan.md](week2-plan.md) §1.2
- [x] Supabase 프로젝트 셋업 + DB 스키마 (`0001`~`0005` 마이그레이션, 로컬=원격 일치)
- [x] Supabase Edge Functions(Deno) 골격 — `discord-interactions`·`monitor`·`market-data`·`review-agent` + `_shared/{db,discord,gemini,kis}.ts`
- [x] 조건 저장소를 Supabase로 (`conditions` 테이블 — 원본 `portfolio.json` 대체)
- [x] 조건 관리 화면 (`ConditionsPage` 조회 전용 + 추가는 종목 페이지 `ConditionForm`)
- [x] 저널·차트·복기 화면 — 구 저널(JournalPage)은 IA 재편으로 **종목 페이지(`/stock/:ticker`) + 히스토리(`/history`)로 흡수**

### 자연어 조건 알림

- [x] Discord 슬래시 커맨드로 자연어 입력 받기 (`/알림`)
- [x] 자연어 → 조건 JSON 변환 (Gemini Structured Outputs, `parseNaturalAlert`)
- [x] 종목 마스터 데이터로 종목 검증 (`symbols` 시드)
- [x] 조건 확인 버튼 (저장 전 사용자 확인 — `disabled` 선저장 → 확정 시 `active`)
- [x] 조건 저장 (Supabase)
- [x] Supabase Cron(pg_cron + pg_net) 스케줄 설정 (`0002_cron`, 5분)
- [x] 감시 Edge Function: 활성 조건 조회 → KIS 현재가/일봉 → 조건 평가 (price / sma_cross)
- [x] 조건 충족 시 알림 문구 생성 + Discord 발송 (+ `alerts` 이력 insert)
- [x] 1회성 알림 후 조건 완료 처리 (edge-trigger + `delete_after_alert`)

### 원클릭 기록

- [x] 알림 메시지에 매수/매도/**관망** 기록 버튼 (`0005`로 hold 추가, 3-way)
- [x] 버튼 클릭 → Edge Function이 기록 저장 (가격·시각 자동, `handleTrade`)
- [x] 웹에서 기록 확인·메모 보완 (종목 페이지 + 히스토리 인라인 편집)

### AI 매매 복기 (코칭 에이전트)

- [x] 차트 위 매매 기록 마커 표시 (매수▲/매도▼/관망●/조건설정■/조건충족● + 가격조건 수평선)
- [x] 기록 목록/상세 화면 (`HistoryPage`·`ReviewPage` — 상세는 `/trade/:id`로 개편 예정, week2-plan WP-D)
- [x] AI 복기 요청 버튼 (온디맨드 — 자동 실행 아님)
- [x] 복기 에이전트 도구 구현: `search_past_trades` / `get_price_context` / `get_past_reviews`
- [x] Gemini function-calling 루프 (최대 6회) → 종합 판단
- [x] 복기 프롬프트 설계 (타이밍·감정·반복 실수 관점)
- [x] 복기 결과 저장 (`cited_trade_ids` 환각 필터링 포함) + 결과 화면
- [x] 히스토리 화면 (완주 루프 체인)
- [ ] **`review-agent` 원격 배포** — 코드 완성·미배포(404). `GEMINI_API_KEY` 확인 필요 → week2-plan **WP-A A2**

### Should (여유 시)

- [x] 알림 문구에 과거 복기 메모리 한 줄 연결 — `monitor`의 `fetchMemoryLine`(저장된 복기 **조회** 방식). 알림 시점 LLM 생성(에이전트화)은 연기(week2-plan §3 결정 3)

## 2단계 — 다중 사용자

> 신규 백로그(기록 필드 확장·차트 클릭 기록·상세 라우팅·히스토리 카드·AI 사용량 ledger)는 [week2-plan.md](week2-plan.md) §2 참조.

- [x] Supabase Auth 로그인 + **회원가입** (`LoginPage` 스플릿, `signUp` 탭 — 2026-07-14 추가)
- [x] 전 테이블 Row Level Security 적용 (`0001_schema.sql`, `auth.uid()=user_id`)
- [ ] **신규 가입 계정 `profiles` 자동생성** (`handle_new_user` 트리거, `0004`) — 미작성. 현재 신규 계정은 FK 실패 → week2-plan **WP-A A1 (최우선)**
- [ ] Discord 계정 연결 (연동 코드 방식, [discord-linking.md](discord-linking.md) 설계 확정) → week2-plan **WP-G**
- [ ] 감시 Edge Function이 사용자별 조건 조회 (`getSingleUser` → 역조회 전환, discord-linking.md §7)
- [ ] 알림을 사용자별 Discord 채널로 발송
