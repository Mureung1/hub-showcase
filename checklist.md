# Briefy 작업 체크리스트

> 우선순위: **P0 → P1 → Phase 2 → Phase 3** 순서로 진행한다.
> P0(A-1 저장+되묻기, 브리핑 홈)가 완성되기 전에는 P1(A-2 조회, A-3 수정·삭제)에 착수하지 않는다. (CLAUDE.md "하지 말 것")
>
> 완료 항목 형식: `- [x] 항목 — 완료일 / 비고`

---

## P0 선행 — mock 기반 화면 흐름 완성 (서버 미접촉, FE만)

> 목적: `src/api`·`server` 연동 전에, mock 데이터만으로 plan.md 5.2/5.3 플로우가 화면상 끊김 없이 동작하는지 먼저 검증한다.
> 여기서 만든 UI 껍데기는 이후 P0/P1 항목이 실 서버로 교체될 때 그대로 재사용된다.

- [ ] `src/components/chat/ChatInput.tsx` — 예시 문장 placeholder
- [ ] `src/pages/BriefingPage.tsx` — `briefing` 상수 → `useState` 승격
- [ ] `src/pages/BriefingPage.tsx` — confirm 확정(과제 키워드) 시 실제 mock `deadlines` 갱신
- [ ] `src/pages/BriefingPage.tsx` — 파싱 실패 시뮬레이션(원문 memo 보존)
- [ ] `src/components/briefing/DeadlineItem.tsx` — 완료 체크 UI 추가 (mock 레벨)
- [ ] `src/components/briefing/RoutineCard.tsx` — 완료 체크 로컬 state → 부모 state 승격
- [ ] `src/lib/sortByCompleted.ts`(신규) + DeadlineCard/RoutineCard 완료 항목 하단 정렬 적용
- [ ] `src/components/chat/TargetSelectOverlay.tsx`(신규) — S2-d mock 트리거로 구현
- [ ] `src/pages/BriefingPage.tsx`, `QueryResult.tsx` — 조회 결과를 "브리핑 위 겹침"으로 전환 + `QueryData` 타입 최소 일반화
- [ ] `src/components/chat/DetailOverlay.tsx`(신규) — S4 읽기 전용 범용 상세 오버레이

---

## P0 — A-1(저장+되묻기) + 브리핑 홈

### 기능 B: 브리핑 대시보드 (S1 홈)

- [x] `src/pages/BriefingPage.tsx` — 2026-07-15 / 브리핑 홈 컴포지션 루트, 현재 `MOCK_BRIEFING` 사용 중
- [x] `src/components/briefing/BriefingHeader.tsx` — 2026-07-15
- [x] `src/components/briefing/ScheduleCard.tsx`, `ScheduleItem.tsx` — 2026-07-15
- [x] `src/components/briefing/RoutineCard.tsx` — 2026-07-15 / 완료 체크가 컴포넌트 로컬 state뿐 (새로고침 시 초기화, 서버 반영 없음) → 위 "P0 선행" 섹션에서 부모 state로 승격 예정, 서버 반영은 여전히 미완
- [x] `src/components/briefing/MealCard.tsx` — 2026-07-15
- [x] `src/components/briefing/DeadlineCard.tsx`, `DeadlineItem.tsx` — 2026-07-15
- [x] `src/components/briefing/MemoCard.tsx` — 2026-07-15
- [x] `src/components/common/DdayBadge.tsx` — 2026-07-15
- [x] `src/mocks/briefing.ts` — 2026-07-15 / 프로토타입 목데이터, 실 연동 후 제거 대상

**남은 작업**
- [x] `supabase/migrations/0001_init.sql` — 2026-07-15 / schedules, tasks, routines, routine_logs, meals, memos, reminders 7개 테이블 생성. `raw_input`/`created_at` 전체 포함, `routine_logs`에 `unique(routine_id, date)` 제약 추가, `reminders.target_id`는 다형성 참조라 FK 없이 애플리케이션 레이어에서 무결성 보장하기로 함 (주석으로 명시). RLS는 켜두고 정책은 없음(서비스 롤 전용 접근 유지). **아직 실제 Supabase 프로젝트에 적용은 안 함 — 다음 세션에서 `.env` 채운 뒤 적용 필요**. 설계 근거는 [docs/data-model.md](docs/data-model.md)에 문서화 완료 (2026-07-15)
- [x] `shared/schemas.ts` 재점검 — 2026-07-15 / `RoutineLogSchema`/`ReminderSchema`에 `rawInput`/`createdAt` 누락 확인 후 추가 완료, typecheck 통과 확인
- [x] `server/lib/supabaseClient.ts` — 2026-07-15 / 서비스 롤 키로 Supabase 클라이언트 초기화, lazy singleton 패턴 (dotenv 로드 순서 문제 회피)
- [ ] `server/services/briefingService.ts` — 오늘 날짜 기준 7개 테이블 조회·필터링·정렬 + 루틴 반복 규칙에서 "오늘 순번"(예: 2분할 중 상체/하체) 계산하는 순수 함수
- [ ] `server/routes/briefing.ts` — `GET /api/briefing?date=YYYY-MM-DD`, `briefingService` 호출 후 응답 직렬화
- [ ] `server/index.ts`에 `briefing` 라우트 등록 (현재 `/api/health`만 존재)
- [ ] `src/api/briefingApi.ts` — FE에서 `GET /api/briefing` 호출하는 래퍼 (fetch + 응답 파싱)
- [ ] `src/pages/BriefingPage.tsx` — `MOCK_BRIEFING` 제거, `briefingApi`로 실 데이터 로드 + 로딩/에러 상태 처리
- [ ] 브리핑 카드 완료 체크(탭) → 서버 반영: 루틴 체크 시 `routine_logs` insert, 과제 체크 시 `tasks.completed` 업데이트
- [ ] 완료 항목이 카드 하단으로 이동하는 정렬 로직 구현 (plan.md 3.2.2, 현재 미구현) — mock 레벨 구현은 "P0 선행" 섹션에서 완료 후 이 줄을 체크 처리
- [ ] 루틴 순환 계산 시나리오 수동 검증: 오늘 상체 day 완료 → 다음 방문 시 하체 day로 전환되는지 확인

### 기능 A-1: 자연어 저장 파이프라인 (파싱 → 분류 → 저장 + 되묻기)

- [x] `shared/schemas.ts` — 2026-07-15 / zod 스키마 1차 정의 완료 (`ParseResultSchema` resolved/clarify 두 상태만 존재 — A-2/A-3 확장 필요, 아래 미확인 사항 참고)
- [x] `src/lib/parseResultToConfirmData.ts` — 2026-07-15 / 파싱 결과 → 확인 카드 데이터 변환 로직
- [x] `src/components/chat/ChatInput.tsx` — 2026-07-15 / 하단 상주 입력창
- [x] `src/components/chat/ConfirmOverlay.tsx` — 2026-07-15 / 확인 카드 UI, "수정"·"실행 취소" 버튼은 현재 `onClose`만 호출하는 목업
- [x] `src/components/chat/ClarifyOverlay.tsx` — 2026-07-15 / 되묻기 선택지 UI
- [x] `src/components/chat/QueryResult.tsx` — 2026-07-15 / 조회 결과 UI, 현재 `Task[]` 전용 구조

**남은 작업**
- [ ] `.env` 로컬 파일 생성 및 `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 값 채우기 (커밋 금지, `.env.example` 키만 참고) — **위 마이그레이션 적용과 클라이언트 실동작 검증의 선행 조건**
- [x] `server/lib/anthropicClient.ts` — 2026-07-15 / Claude API 클라이언트 초기화, lazy singleton 패턴 (모델명은 다음 단계 parseService에서 결정 — 프론티어 모델 vs 경량 모델 트레이드오프 아직 미확정)
- [ ] `server/lib/promptTemplates.ts` — 자연어 → JSON 파싱 프롬프트 (intent 5종 create/update/delete/query/complete, type 6종 schedules/tasks/routines/meals/memos/reminders)
- [ ] `server/services/itemsService.ts` — 7개 엔티티 공통 CRUD 함수 (Supabase insert/update/delete/select), 저장 시 `raw_input` 원문 보존 포함
- [ ] `server/services/parseService.ts` — Claude 응답 수신 → `ParseResultSchema`로 zod 검증 → `resolved`면 `itemsService`로 저장, `clarify`면 후보 목록 반환
- [ ] 파싱 실패(zod 검증 실패) 예외 처리 — 원문을 `memos` 테이블에 `raw_input`으로 저장 + 재입력 유도 응답 반환 (plan.md 3.1.5)
- [ ] `server/routes/parse.ts` — `POST /api/parse` 라우트, 에러는 `{ error: { code, message } }` 형식으로 통일
- [ ] `server/index.ts`에 `parse` 라우트 등록
- [ ] `src/api/parseApi.ts` — FE에서 `POST /api/parse` 호출하는 래퍼
- [ ] `src/pages/BriefingPage.tsx` — `handleSend`의 키워드 기반 목업 분기(`includes('운동')`/`includes('마감')`)를 `parseApi` 실 호출로 교체
- [ ] `src/mocks/responses.ts` — 실 연동 후 제거 또는 개발용 fallback으로 격리
- [ ] `ConfirmOverlay`의 "수정"/"실행 취소" 액션 버튼 실제 동작 연결
- [ ] "다음주 화요일 오후 3시 팀플 회의, 전날 알려줘" 같은 동시 생성(일정+리마인더) 케이스 프롬프트/저장 로직 처리
- [ ] 모호한 입력(예: "운동") → 되묻기 → 선택 → 확인 카드까지 실 데이터로 종단 플로우 검증 (S1 → S2-a → S2-c → S2-b → S1)

---

## P1 — A-2(조회) + A-3(수정·삭제)

> P0 전 항목이 완료된 뒤에만 착수한다.

### A-2 조회

- [ ] `shared/schemas.ts`에 조회 응답 스키마 추가 — 현재 `QueryData`(제목/count/items/baseDate)는 `src/types/overlay.ts`에 FE 전용으로만 정의되어 있어 "스키마는 shared에서 한 번만 정의" 원칙과 어긋남. `ParseResultSchema`에 query 결과용 status 분기 추가 또는 별도 `QueryResultSchema` 정의 필요
- [ ] `server/lib/promptTemplates.ts` — query 의도 파싱 프롬프트 추가 (대상 엔티티/기간 조건 추출)
- [ ] `server/services/parseService.ts` — intent=`query` 분기 추가
- [ ] `server/services/queryService.ts` (또는 `briefingService` 재사용) — "이번 주 마감" 등 기간 기반 필터링 (가능한 범위에서 로컬 필터링 우선 — plan.md 8.1 리스크 대응)
- [ ] `src/pages/BriefingPage.tsx` — `MOCK_QUERY_RESPONSE` 제거, 실 `parseApi` 응답의 query 결과를 `QueryResult`에 연결
- [ ] `src/components/chat/QueryResult.tsx` — `Task[]` 전용 구조를 다른 엔티티(일정/루틴/메모 등) 조회 결과도 표시 가능하도록 확장 검토 — 타입 최소 일반화는 "P0 선행" 섹션에서 mock 기준 선구현 예정, 실 서버 query 응답 연결만 남음

### A-3 수정·삭제

- [ ] `server/lib/promptTemplates.ts` — update/delete 의도 파싱 프롬프트 추가 (제목/날짜/유형 기반 대상 식별 힌트)
- [ ] `server/services/parseService.ts` — update/delete 시 `itemsService` 조회로 대상 후보 검색, 후보 0/1/2개 이상 분기 처리
- [ ] `shared/schemas.ts` — 대상 후보 2개 이상일 때(S2-d)의 응답 스키마 추가
- [ ] `src/types/overlay.ts` — `OverlayState`에 대상 선택(S2-d) 케이스 추가
- [ ] `src/components/chat/TargetSelectOverlay.tsx`(신규) — S2-d 대상 선택 목록 UI — mock 트리거 버전은 "P0 선행" 섹션에서 선구현 예정, 여기선 실 서버 후보 연결만 남음
- [ ] `server/routes/items.ts` — `GET/POST/PATCH/DELETE /api/items/:type` 라우트 구현 (`itemsService` 재사용)
- [ ] `src/api/itemsApi.ts` — FE에서 `/api/items/:type` CRUD 호출 래퍼
- [ ] `ConfirmOverlay`의 "실행 취소"(undo) 액션 실제 동작 정의
- [ ] S4 항목 상세/편집 화면 구현 — 브리핑 카드 항목 탭 시 상세 표시 (자연어 재입력 유도 vs 간단 편집 폼, 방식 미확정 → 미확인 사항) — 읽기 전용 버전은 "P0 선행" 섹션에서 선구현 예정, 편집 방식 결정은 여전히 미결

---

## Phase 2 — 진입 조건: 주 3회 이상 재방문 사용자 확보 + 자연어 입력 성공률 90% 이상

> 참고: plan.md 원안은 "localStorage → 서버 전환"을 Phase 2로 뒀지만, 이 저장소는 CLAUDE.md 기준 Express+Supabase를 P0부터 이미 채택했다. 따라서 "서버 전환" 자체는 P0/P1에서 이미 진행되며, Phase 2는 로그인/계정·알림·주간 뷰·음성 입력만 해당한다.

- [ ] 로그인/계정 시스템 도입 (예: Supabase Auth) — 다중 사용자 지원을 위한 `user_id` 컬럼 마이그레이션 필요
- [ ] 푸시 알림 발송 — `reminders.remind_at` 도래 시 알림 (스케줄러/워커 도입)
- [ ] 주간 뷰 — 일정/과제/루틴 주 단위 조회 화면
- [ ] A-4 음성 입력(STT) — 음성 → 텍스트 변환 후 기존 `/api/parse` 파이프라인 재사용
- [ ] 배포 인프라 정비 (미결 사항: 배포 방식 결정 후 착수)
- [ ] 파싱 성공률 계측/로깅 체계 — Phase 2 진입 조건(90%) 판단용

## Phase 3 — 진입 조건: Phase 2 리텐션 유지 + 모바일 웹 접속 비중이 지배적임 확인

- [ ] React Native 프로젝트 셋업 — `server/`, `shared/` 로직 재사용 검증
- [ ] A-5 음성 대화(TTS) — AI 응답 음성 합성
- [ ] 외부 캘린더 동기화 (Google/Apple Calendar)

---

## 범위 밖 / 하지 말 것 (CLAUDE.md 기준)

- 음성 입력(A-4)·음성 대화(A-5)는 Phase 2/3 진입 조건 충족 전 착수 금지
- 로그인/계정, 푸시 알림, 주간·월간 뷰, 통계·리포트, 외부 캘린더 동기화, 위젯, 브리핑 커스터마이징: Phase 2/3 이전 구현 금지
- 일정 관리 외 잡담·검색 응답 기능 추가 금지
- 새 테이블이 필요해 보이면 임의로 만들지 말고 먼저 확인 (엔티티는 7개 고정)
- 외부 UI 라이브러리, 상태관리 라이브러리 별도 합의 전 도입 금지 (useState/useReducer만 사용)
- Supabase 테이블 대시보드 수동 생성 금지 — 반드시 `supabase/migrations/` SQL로

## 미결 사항 (결정 필요)

- 배포 방식: FE(Vercel) + BE 호스팅(Render 등) vs 로컬 시연
- 테스트 프레임워크(Vitest) 도입 여부
- 조회(A-2) 응답과 대상 다중 후보(A-3, S2-d) 응답을 `shared/schemas.ts`의 `ParseResultSchema`에 어떻게 확장할지 — status 분기 추가 vs 별도 스키마 분리
- `RoutineLogSchema`/`ReminderSchema`에 `raw_input` 필드가 없음 — CLAUDE.md "모든 엔티티는 raw_input 보존" 원칙과의 정합성 확인 후 마이그레이션 전 스키마 확정 필요
- `react-router-dom`이 의존성에 설치되어 있으나 `App.tsx`에서 미사용 — S4(항목 상세/편집)를 별도 라우트로 만들지, 오버레이로 유지할지
- S4 항목 상세/편집 화면 구현 방식 — 자연어 재입력 유도 vs 폼 기반 편집
