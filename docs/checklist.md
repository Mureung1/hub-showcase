# Beacon 작업 체크리스트

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

- [ ] 통합 웹앱 골격 신규 구축 (Vite + React SPA — 원본 두 레포 참고)
- [ ] Supabase 프로젝트 셋업 + DB 스키마 설계 (`conditions` / `trades` / `reviews` — 사용자 컬럼 포함)
- [ ] Supabase Edge Functions(Deno) 기본 골격 (Discord 인터랙션 · KIS 호출 · 에이전트 실행)
- [ ] 조건 저장소를 Supabase로 (기존 `portfolio.json` 방식 대체)
- [ ] 조건 관리 화면 구현
- [ ] 저널·차트·복기 화면 구현

### 자연어 조건 알림

- [ ] Discord 슬래시 커맨드로 자연어 입력 받기
- [ ] 자연어 → 조건 JSON 변환 (Gemini Structured Outputs)
- [ ] 종목 마스터 데이터로 종목 검증
- [ ] 조건 확인 버튼 (저장 전 사용자 확인)
- [ ] 조건 저장 (Supabase)
- [ ] Supabase Cron(pg_cron + pg_net) 스케줄 설정
- [ ] 감시 Edge Function: 활성 조건 조회 → KIS 현재가/일봉 조회 → 조건 평가 (가격 / 이동평균선)
- [ ] 조건 충족 시 알림 문구 생성 + Discord 발송
- [ ] 1회성 알림 후 조건 완료 처리

### 원클릭 기록

- [ ] 알림 메시지에 매수/매도 기록 버튼 추가
- [ ] 버튼 클릭 → Edge Function이 저널에 기록 저장 (가격·시각 자동)
- [ ] 웹 저널에서 기록 확인·메모 보완

### AI 매매 복기 (코칭 에이전트)

- [ ] 차트 위 매매 기록 마커 표시
- [ ] 기록 목록/상세 화면
- [ ] AI 복기 요청 버튼
- [ ] 복기 에이전트 도구 구현: `search_past_trades`(DB) / `get_price_context`(KIS) / `get_past_reviews`(DB)
- [ ] Gemini function-calling 루프로 도구 순차 호출 → 종합 판단
- [ ] 복기 프롬프트 설계 (타이밍·감정·반복 실수 관점)
- [ ] 복기 결과 저장 (`cited_trade_ids` 포함) + 결과 화면
- [ ] 히스토리 화면 (지난 기록 + 복기 열람)

### Should (여유 시)

- [ ] 알림 문구에 과거 복기 메모리 한 줄 연결 (능동 개입)

## 2단계 — 다중 사용자

> 2주차 실행 계획(프로토타입 ↔ MVP 비교 + 우선순위 태스크)은 [docs/week2-plan.md](week2-plan.md) 참조.

- [ ] Supabase Auth 가입/로그인
- [ ] 전 테이블 Row Level Security 적용
- [ ] Discord 계정 연결 (사용자 ↔ Discord ID 매핑, 알림 채널 등록)
- [ ] 감시 Edge Function이 Supabase에서 사용자별 조건 조회
- [ ] 알림을 사용자별 Discord 채널로 발송
