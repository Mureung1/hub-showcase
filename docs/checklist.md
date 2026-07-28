# SpendMate — 개발 체크리스트

4주 로드맵을 실행 가능한 작업 단위로 쪼갠 문서. 완료한 항목은 체크(`- [x]`)로 표시하며 진행한다.

---

## 1주차 — 입력 파이프라인 구축 + PoC

### 환경 설정
- [x] Spring Boot 프로젝트 초기 설정 (Java, Gradle)
- [x] React 프로젝트 초기 설정
- [x] PostgreSQL 로컬/개발 DB 세팅
- [x] Git 브랜치 전략 확정 — 당분간 `work` 브랜치 하나로 계속 진행, 필요해지면 그때 feature 브랜치 도입

### PoC (사전 검증 — 가장 먼저)
- [x] 네이버 클로바 OCR API 신청 및 테스트 호출
- [ ] ~~업스테이지 Document AI와 인식률 비교 테스트~~ — 비교 없이 클로바로 바로 결정 (스킵)
- [x] OCR 최종 후보 결정 — 클로바 OCR
- [x] 네이버 쇼핑 검색 API 신청 및 테스트 호출 — 구조화된 가격 데이터(숫자) 제공 여부 확인 (2주차 멘토링 피드백으로 F15 자체를 스코프에서 완전히 제외하며 사용하지 않기로 최종 결정)
- [x] 공공데이터포털 레시피 API 신청 및 테스트 호출 (2주차 멘토링 피드백으로 F11 자체를 스코프에서 제외 — 외부 의존성·매칭 로직 복잡도 리스크)
- [x] Claude API 키 발급, Tool Use 최소 예제(하드코딩 Context) 동작 확인 — 배달비↑+예산↑ Context로 recipe_tool 정확히 선택 확인 (Tool Use 메커니즘 자체는 검증됨, 실제 Tool은 이후 내부 데이터 조회로 변경)

### 입력 파이프라인
- [x] 영수증 업로드 UI (이미지 첨부 화면) — `AddExpenseScreen.tsx`의 `ImageUploadStep`
- [x] 업로드 이미지 → OCR API 연동 — `ClovaOcrClient`, `POST /api/receipts/upload`
- [x] OCR 결과 텍스트 파싱 로직 (상호명/항목/금액/날짜 추출) — `OcrResultParser` (좌표 기반)
- [x] DB 스키마 설계: 영수증 원본 메타데이터 테이블 / 파싱된 지출 내역 테이블 분리 — `Receipt`/`Expense` 엔티티, `receipt_id` FK로 연결
- [x] 파싱 결과 DB 저장 확인 — `POST /api/receipts/{id}/confirm`으로 실제 저장, curl·psql·실제 브라우저 업로드로 검증

---

## 2주차 — 분류 및 시각화

- [x] 자취생 특화 카테고리 분류 로직 (브랜드명 키워드 매핑: 배달/편의점/카페/밀키트/마트/학식/쇼핑) — `CategoryClassifier`, 상호명 키워드 기반. 목록에 없는 브랜드는 OTHER/DELIVERY로 추정 (한계는 backend-flow.md 참고)
- [x] 오분류 수동 수정 UI — `ResultStep`에서 품목명/금액/카테고리(드롭다운) 모두 직접 수정 가능, 수정값이 `confirm` 저장 시 그대로 반영됨
- [x] 소비 요약 대시보드 (카테고리별/월별 합계, 그래프) — `GET /api/expenses/summary`(카테고리별), `GET /api/expenses/summary/daily`(일별), `StatsScreen.tsx` 실데이터 연결. `AI_INSIGHTS` 섹션은 F16 연동 전까지 mock 유지
- [x] 구독(고정비) 등록·수정·삭제 화면
  - [x] SubscriptionController/Service 뼈대 + GET 목록 API (#13)
  - [x] POST 구독 등록 API (#14)
  - [x] PUT 구독 수정 API (#15)
  - [x] DELETE 구독 삭제 API (#16)
  - [x] 입력 검증 + 예외 핸들러 정리 (#17)
  - [x] 구독 + 예산 프론트 API 클라이언트 함수 작성 (#19) — `getSubscriptions`/`createSubscription`/`updateSubscription`/`deleteSubscription`/`getBudget`/`setBudget`
  - [x] MyPageScreen 구독 목록 mock→GET 연동 (#20)
  - [x] 예산 입력 UI 추가 (MyPageScreen, 화요일 검토 중 발견한 누락 항목) (#54)
  - [x] SubscriptionManageModal 저장 → 실제 등록/수정 API 연결 (#21)
  - [x] 구독 삭제 버튼 → DELETE API 연결 (#22)
  - [x] 새로고침 후 데이터 유지 검증 (#23)
  - [x] (선택) 구독 아이콘/컬러 매핑 정리 (#48)
  - [x] (선택) 구독 CRUD 통합 테스트 코드 작성 (#24)
- [x] 수동 지출 입력 기능 (현금/계좌이체/더치페이 등, 금액·카테고리·날짜 직접 입력) — `POST /api/expenses`, `FormStep`에서 연결
- [x] 수동 입력 데이터가 DB에 영수증 기반 지출과 동일하게 저장되는지 확인 — 동일한 `expenses` 테이블, `input_type=MANUAL`로만 구분됨 (psql로 확인)

---

## 3주차 — 예측 + Agent + Tool 연동

### 리스크 점검 (2주차 planner 에이전트 점검에서 발견, 체크리스트에 항목 없어 일정 누락 우려)
- [ ] 로그인/인증 처리 방향 결정 — `ExpenseService`의 `SEED_USER_ID=1L` 하드코딩이 아직 남아있음(`TODO: 로그인 붙으면 실제 로그인 유저로 교체`). 데모 자체는 문제없지만 plan.md 6.1의 "회원가입/로그인 후 업로드" 요구사항과의 괴리를 정리할지 결정 필요
- [ ] `AICoachScreen.tsx` mock 데이터 → 실제 API 연동 — F16 Agent API가 나온 뒤 진행 (`SurvivalModeScreen.tsx`는 #30/#31에서 완료됨)

### 예측 & 생존 모드
- [x] 월 총예산 입력/조회 API (`BudgetService`/`BudgetController`, 기존 `Budget` 엔티티 재사용) — F6 소진 예측의 전제조건이라 F9(선택기능)에서 최소 범위만 이번 주에 먼저 구현 (#18)
- [ ] 생활비 소진 예측 로직 (이번 달 누적 일평균 + 고정비 결합)
  - [x] 이번 달 누적 일평균 변동비 계산 메서드 (#25)
  - [x] 일평균×남은일수 + 구독 고정비 → 소진 예상일 계산 (#26)
  - [x] `GET /api/expenses/prediction` API (#27)
- [x] 예측 신뢰성 안내 문구 (이번 달 데이터 5일 미만 시 안내) (#28)
- [ ] 월말 생존 모드 UI (남은 돈 / 남은 기간 / 오늘 쓸 수 있는 금액)
  - [x] 예산 임계치 이하 자동 판정 (survivalMode flag) (#29)
  - [x] SurvivalModeScreen.tsx mock → 실제 API 연동 (#30)
- [x] 예산 임계치 이하 시 생존 모드 자동 전환 로직 (#31)

### Context 계산
- [x] 단기 신호 계산 (배달비 증가율, 예산 대비 지출률) (#32)
- [x] 장기 신호 계산 (카테고리 구성/추세, 구독 상태, 최대 90일) (#33)
- [x] 장기 신호 데이터 품질 단계 분기 구현 (5일 미만 / 5~13일 / 14~89일 / 90일 이상) (#34)
- [x] 단기+장기 신호를 하나의 Context 객체로 통합 (`ContextService` + `GET /api/context`) (#35)

### AI Agent (2주차 멘토링 후 스코프 변경 — F11/외부 F15 제외, 내부 데이터 조회 Tool + 챗봇 구조로)
> 2026-07-22 planner 점검: 목/금 이틀에 이 섹션 전체(#36~#47, #55)를 다 끝내는 건 낙관적일 수 있음. 미리 항목을 빼두진 않고, 못 끝낸 게 있으면 주말에 마저 하기로 함.
- [x] 시스템 프롬프트 작성 (Goal + Context 설명 + Tool 목록 + 출력 형식 규칙) (#36)
- [x] Claude API tool use 연동 (WebClient 직접 호출로 확정 — 이유는 CLAUDE.md 참고) (#37)
- [x] `get_expense_summary` Tool 구현 (F5 `/api/expenses/summary` 재사용, 외부 API 없음) (#38)
- [x] `get_subscriptions` Tool 구현 (F13 API 재사용, F13 완료 후 진행) (#39)
- [x] `get_budget` Tool 구현 (예산 API 재사용, "예산 얼마야?" 질문 대응 — 수요일 다이어그램 점검 중 발견한 설계 구멍, amount=null 시 안내 처리 포함) (#55)
- [x] 챗봇 질의응답 플로우 구현 (사용자 질문 → 필요 시 Tool 호출 → 답변) (#40)
- [x] 지출 추가 시 1회 자동 판단 플로우 구현 (Context 보고 먼저 말 걸지 여부 결정) (#41)
- [x] Tool 미호출("개입/응답 불필요") 시에도 안내 메시지가 함께 나오는지 확인 (#42)
- [x] Reasoning Summary(선택 이유) 생성 확인 — 실제 Context 값을 인용하는지 검증 (#43)
- [x] Tool 결과를 Agent가 사용자 친화적 메시지로 정리하는 2차 호출 구현 (#44)
- [x] 동일 Context 5~10회 반복 실행 → 판단 일관성 확인 (temperature 낮게 설정) (#45) — API 비용 절감을 위해 3회로 축소 실행, temperature=0 설정, 3회 모두 동일 판단
- [x] "일부 신호는 같지만 전체 Context가 다른" 케이스로 실제 판단이 달라지는지 검증 (#46)
- [x] `AICoachScreen.tsx` mock → 실제 Agent 연동 (#47)

### 이번 주 부트캠프 공통 요구사항 (아키텍처 시각화 / TDD / Agent 산출물)
- [x] 아키텍처 다이어그램 작성 (mermaid, README에 화면-서버-DB 데이터 흐름) (#49)
- [x] 테스트코드 생성 Skill 제작 (#50)
- [x] F6 계산 로직 TDD로 개발 (테스트 먼저 작성 → 구현, #25/#26 대상) (#51)
- [x] code-reviewer 에이전트로 이번 주 커밋 검증 (매일 커밋 전) (#52)
- [x] 나만의 워크플로우 문서로 정리 (`docs/workflow.md` 신규) (#53)

---

## 4주차 — 마무리 및 실제 배포 준비

### 회원가입/로그인 (최우선 — 2026-07-22 결정: 부트캠프 데모로 끝나지 않고 4주 안에 실제 배포하기로 함)
> 2026-07-27 feature-planner 점검: SEED_USER_ID 교체(#62)는 F16(#40~47) 완료 후 진행 — 새 서비스(AgentService)까지 다 만들어진 뒤 한 번에 교체하기 위함.
> 2026-07-27 재조정 2차: F16 전체(#40~46)와 인증 백엔드(#57~59)를 전부 월요일 하루로 합침(#40,41,42,43,44,45,46,57,58,59) — 부담 크지만 의도적으로 압축. 배포(#70,71)를 화요일로 당겨서 수요일 전에 인프라를 먼저 검증해두고, 인증 방식은 OAuth 대신 이메일/비밀번호+BCrypt로 확정(외부 서비스 연동 리스크·redirect URI 이슈를 이번 주엔 피하기 위함, OAuth는 크런치 이후 검토).
- [x] 비밀번호 해싱 방식 결정 및 의존성 추가 (Spring Security의 `BCryptPasswordEncoder` 등 — 평문 저장 금지) (#57)
- [x] 회원가입 API (이메일 중복 확인 + 비밀번호 해싱 후 `users` 테이블 저장) (#58)
- [x] 로그인 API (이메일/비밀번호 검증 후 세션 또는 토큰 발급 — 방식은 구현 시점에 확정) (#59)
- [x] 로그인 상태 유지 (새로고침해도 로그인 풀리지 않게) (#60)
- [x] `AuthScreen.tsx`의 가짜 로그인(`setTimeout`으로 아무 값이나 통과) 제거하고 실제 API 연동 (#61)
- [x] 백엔드 전 서비스(`ExpenseService`/`SubscriptionService`/`BudgetService`/`ReceiptService`/`ContextService`/`AgentService`)의 `SEED_USER_ID=1L` 하드코딩을 실제 로그인 유저로 일괄 교체 (#62)
- [x] 인증 안 된 요청 차단 확인 (다른 사람 API를 토큰/세션 없이 호출하면 401/403) (#63)
- [x] 여러 계정으로 가입 후 각자 데이터(구독/예산/지출)가 안 섞이는지 실제로 확인 (#64)

### 배포 (2026-07-27 추가 — Render, 무료 티어)
> 금요일이 프로젝트 마지막 날(버퍼 아님)이라, 배포를 화요일로 당겨서 인프라(Dockerfile/Postgres/환경변수)를 먼저 검증해둔다. 수요일 SEED 교체·프론트 연동 이후 다시 배포해서 반영. 무료 티어는 15분 비활성 시 슬립 — 데모 전 워밍업 curl 필요.
- [ ] 백엔드 Render 배포 설정 (Dockerfile, PostgreSQL 애드온, 환경변수 이관) (#70)
- [ ] 프론트가 배포된 백엔드 API를 바라보도록 설정 변경 (#71)

### 선택 기능 (시간 남으면)
- [ ] 예산 목표 설정 (카테고리별/전체)
- [ ] 구독 결제 예정 알림 + 해지 가이드
- [ ] 주간 리포트 알림

### 스트레치 (1주차 PoC 결과에 따라)
- [ ] 쿠폰/할인 정보 추천
- [ ] 정기배송 vs 일반구매 비교
- [ ] 통신 요금제 최적화

### QA & 데모 준비
- [ ] 전체 플로우 버그 수정 (업로드 → OCR → 분류 → 예측 → Agent → Tool → 화면 출력) (#65)
- [ ] 응답 속도 확인 (결정론적 분석 5초, Agent 경로 10~15초 목표) (#66)
- [ ] 데모 계정용 3개월치 시드 데이터 준비 (장기 Context 시연용) (#67)
- [ ] 데모 시나리오 리허설 (#68)
  - [ ] Case 1: 정상 소비 → 개입 안 함
  - [ ] Case 2: 배달비 증가 + 예산 여유 → 개입 안 함
  - [ ] Case 3: 배달비 증가 + 예산 부족 (2와 일부 신호는 같지만 전체 Context가 다름) → 지출 데이터 조회 Tool 호출 후 먼저 말을 건다
  - [ ] Case 4: 챗봇에 "이번 달 얼마 썼어?" 질문 → Tool 호출 후 실제 숫자로 답변
- [ ] 발표 자료(슬라이드) 정리, README 최종 정리 (프로젝트 소개 + 기술 스택 + 문서 링크), Wiki 기획서 페이지 최종 업로드 (#69) — 실시간 테스트 불필요한 작업이라 금요일 아침으로 이동, 목요일 QA에서 제외