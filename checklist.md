# Briefy 작업 체크리스트

> 우선순위: **P0 → P1 → Phase 2 → Phase 3** 순서로 진행한다.
> P0(A-1 저장+되묻기, 브리핑 홈)가 완성되기 전에는 P1(A-2 조회, A-3 수정·삭제)에 착수하지 않는다. (CLAUDE.md "하지 말 것")
>
> 완료 항목 형식: `- [x] 항목 — 완료일 / 비고`

---

## P0 선행 — mock 기반 화면 흐름 완성 (서버 미접촉, FE만)

> 목적: `src/api`·`server` 연동 전에, mock 데이터만으로 plan.md 5.2/5.3 플로우가 화면상 끊김 없이 동작하는지 먼저 검증한다.
> **2026-07-24 기준 stale**: 아래 항목 대부분이 "mock 레벨 선구현 → 이후 실 서버로 교체" 순서를 건너뛰고 바로 실 서버 연동으로 완료됐다. 실제로 안 된 것만 `[ ]`로 남겨둔다.

- [x] `src/components/chat/ChatInput.tsx` — 예시 문장 placeholder (`"금요일까지 데이터베이스 과제 제출" · "치과 4시로 바꿔줘"`)
- [x] `src/pages/BriefingPage.tsx` — `briefing` 상수 → `useState` 승격
- [x] confirm 확정 시 실제 데이터 갱신 — mock이 아니라 저장 성공 시 `getBriefing()` 재조회로 실제 반영 (아래 A-1 참고)
- [x] 파싱 실패 시 원문 memo 보존 — 시뮬레이션이 아니라 `parseService.fallbackToMemo()`로 실제 동작
- [x] `src/components/briefing/DeadlineItem.tsx` — 완료 체크 UI, 실 서버(`PATCH /api/items/tasks/:id`) 연동까지 완료
- [x] `src/components/briefing/RoutineCard.tsx` — 완료 체크 로컬 state → 부모 state 승격, 실 서버 연동까지 완료
- [x] DeadlineCard/RoutineCard 완료 항목 하단 정렬 — 2026-07-21에 `src/lib/sortByCompleted.ts`로 구현했다가, **2026-07-24에 사용자 피드백으로 제거**: 완료해도 위치는 그대로 두고 텍스트에 취소선+회색만 입히는 방식으로 변경 (파일 삭제, `BriefingPage.tsx`에서 재정렬 호출 제거). 부수효과로 "마감 임박 과제가 마감 가까운 순 유지" 요구사항도 자동으로 만족(서버가 이미 `deadline` 오름차순으로 내려줌)
- [ ] `src/components/chat/TargetSelectOverlay.tsx`(신규) — S2-d 대상 선택 목록 UI, 아직 미착수 (A-3/P1 범위)
- [ ] `src/pages/BriefingPage.tsx`, `QueryResult.tsx` — 조회 결과를 "브리핑 위 겹침"으로 전환 + `QueryData` 타입 최소 일반화, 아직 미착수 (A-2/P1 범위)
- [ ] `src/components/chat/DetailOverlay.tsx`(신규) — S4 읽기 전용 범용 상세 오버레이, 아직 미착수

---

## P0 — A-1(저장+되묻기) + 브리핑 홈

### 기능 B: 브리핑 대시보드 (S1 홈)

- [x] `src/pages/BriefingPage.tsx` — 2026-07-15 / 브리핑 홈 컴포지션 루트, 2026-07-21에 mock 제거하고 `briefingApi`로 실 데이터 연동 완료
- [x] `src/components/briefing/BriefingHeader.tsx` — 2026-07-15
- [x] `src/components/briefing/ScheduleCard.tsx`, `ScheduleItem.tsx` — 2026-07-15
- [x] `src/components/briefing/RoutineCard.tsx` — 2026-07-15 / 완료 체크가 컴포넌트 로컬 state뿐 (새로고침 시 초기화, 서버 반영 없음) → 위 "P0 선행" 섹션에서 부모 state로 승격 예정, 서버 반영은 여전히 미완
- [x] `src/components/briefing/MealCard.tsx` — 2026-07-15
- [x] `src/components/briefing/DeadlineCard.tsx`, `DeadlineItem.tsx` — 2026-07-15
- [x] `src/components/briefing/MemoCard.tsx` — 2026-07-15
- [x] `src/components/common/DdayBadge.tsx` — 2026-07-15
- [x] `src/mocks/briefing.ts` — 2026-07-15 / 프로토타입 목데이터, 2026-07-21 기준 이미 삭제됨(디렉토리 자체가 존재하지 않음) — 이 줄과 A-1 섹션의 `src/mocks/responses.ts` 관련 항목은 stale 기록

**남은 작업**
- [x] `supabase/migrations/0001_init.sql` — 2026-07-15 / schedules, tasks, routines, routine_logs, meals, memos, reminders 7개 테이블 생성. `raw_input`/`created_at` 전체 포함, `routine_logs`에 `unique(routine_id, date)` 제약 추가, `reminders.target_id`는 다형성 참조라 FK 없이 애플리케이션 레이어에서 무결성 보장하기로 함 (주석으로 명시). RLS는 켜두고 정책은 없음(서비스 롤 전용 접근 유지). **2026-07-21에 실제 Supabase 프로젝트에 적용 완료 + `supabase/seed.sql`로 plan.md 페르소나 기반 시드 데이터 삽입 완료 (7개 테이블 전부 REST API로 조회 검증)**. 설계 근거는 [docs/data-model.md](docs/data-model.md)에 문서화 완료 (2026-07-15)
- [x] `shared/schemas.ts` 재점검 — 2026-07-15 / `RoutineLogSchema`/`ReminderSchema`에 `rawInput`/`createdAt` 누락 확인 후 추가 완료, typecheck 통과 확인
- [x] `server/lib/supabaseClient.ts` — 2026-07-15 / 서비스 롤 키로 Supabase 클라이언트 초기화, lazy singleton 패턴 (dotenv 로드 순서 문제 회피)
- [x] `server/services/briefingService.ts` — 2026-07-21 / 오늘 날짜 기준 6개 테이블 병렬 조회 + `resolveTodayRoutines` 순수 함수로 2분할(rotation)/`weekly:`/`daily` 반복 규칙 계산. seed 데이터로 로테이션 시나리오 curl 검증 완료
- [x] `server/routes/briefing.ts` — 2026-07-21 / `GET /api/briefing?date=YYYY-MM-DD`, 날짜 미지정 시 Asia/Seoul 기준 오늘 날짜 기본값, 잘못된 날짜 포맷은 400, 응답은 `BriefingSchema.parse()`로 검증
- [x] `server/index.ts`에 `briefing` 라우트 등록 — 2026-07-21
- [x] `src/api/briefingApi.ts` — 2026-07-21 / FE에서 `GET /api/briefing` 호출하는 래퍼
- [x] `src/pages/BriefingPage.tsx` — 2026-07-21 / mock 상수 제거, `briefingApi.getBriefing()`으로 실 데이터 로드 (로딩/에러 상태 UI는 아직 없음 — console.error만, 필요 시 추가 작업)
- [x] 브리핑 카드 완료 체크(탭) → 서버 반영 — 2026-07-21 / 과제는 기존 `PATCH /api/items/tasks/:id`에 연결, 루틴은 `routine_logs`가 `ItemType`에 없어 전용 라우트 `POST /api/items/routines/:id/complete`(`routineLogService.upsertRoutineLog`, `unique(routine_id,date)` 기준 upsert) 신설. `BriefingSchema.routines`를 `Routine[]`에서 `{ routine, completedToday }[]`로 변경해 오늘 완료 여부를 브리핑 응답에 포함시킴(`RoutineCard` 로컬 state 완전히 제거). FE는 낙관적 업데이트 후 API 호출, 실패 시 콘솔 로그만 남기고 롤백은 하지 않음(MVP 범위)
- [x] 완료 항목이 카드 하단으로 이동하는 정렬 로직 구현 — 2026-07-21 / `src/lib/sortByCompleted.ts` 추가, `BriefingPage`에서 렌더 직전 적용. 구현 중 `briefingService`가 `tasks`를 `completed=false`로만 조회하고 있어 체크하면 하단 이동이 아니라 목록에서 즉시 사라지는 버그를 발견해 필터 제거함(전체 과제를 반환하고 정렬은 FE 책임)
- [x] 루틴 순환 계산 시나리오 수동 검증 — 2026-07-21 / seed 데이터(하체 운동을 7/19에 완료 처리)로 7/21·7/20·7/22 각각 curl 호출해 상체 day 전환과 `weekly:mon,wed,fri` 러닝 노출을 확인함

**실사용 피드백 반영 (2026-07-24)**
- [x] 완료 체크 시 카드 하단으로 이동하던 걸 제거하고 취소선+회색으로만 표시 — `RoutineCard.tsx`/`DeadlineItem.tsx`에 `--done` modifier 클래스 추가, `sortByCompleted` 삭제 (위 "P0 선행" 참고). **2026-07-24 후반에 아래 "완료함(아카이브) 기능"으로 다시 대체됨** — 과제는 이제 완료 시 취소선이 아니라 브리핑에서 완전히 사라짐
- [x] 루틴/일정 시간 표시가 `20:00:00 ~ 22:00:00`처럼 초까지 나오던 것 → `20:00-22:00` 형식으로 수정 (Postgres `time` 컬럼이 초 단위까지 내려오는 걸 FE가 그대로 찍고 있었음, `RoutineCard.tsx`/`ScheduleCard.tsx`에서 `slice(0,5)`로 절삭)
- [x] "오늘의 루틴" 기본 데이터 교체 — 상체 "푸시업 50x4", 하체 "스쿼트 50x4", 러닝 루틴 삭제 (`supabase/seed.sql`, `server/scripts/seed.ts`). 부수효과: 러닝이 사라지면서 특정 요일에 "2분할+러닝"이 동시에 떠서 `completeRoutine()`이 "루틴을 하나로 특정 못함"으로 실패하던 문제도 같이 없어짐
- [x] **seed 날짜를 하드코딩된 절대 날짜(`2026-07-21` 등) → 실행 시점 "오늘"(Asia/Seoul) 기준 상대 날짜로 전면 재작성** — 식단이 화면에서 사라진 버그의 근본 원인이었음(세션이 진행되며 "오늘"이 넘어갔는데 식단 row는 예전 날짜에 고정돼 있어 필터링에 안 걸림). `seed.ts`는 `briefingService.getTodaySeoul()` + `date-fns addDays` 재사용, `seed.sql`은 `(now() at time zone 'Asia/Seoul')::date + N` 인라인 계산식 사용(CTE 체이닝은 이전에 타입 추론 문제가 있어 피함). 실제로 `npm run seed` 재실행 후 오늘 날짜 데이터로 채워지는 것까지 curl로 검증
- [x] 메모 항목 앞에 "- " 접두사 추가 (`MemoCard.tsx`) — **2026-07-24 후반에 다시 제거**: 아래 "완료함(아카이브) 기능" 작업에서 메모 체크박스 레이아웃을 마감 임박 과제와 통일하며 접두사도 뺌

**완료함(아카이브) 기능 (2026-07-24)**
> 체크박스 완료 처리 방식이 "취소선+회색으로 제자리 유지"(바로 위 7/24 피드백 항목)에서 **완료 즉시 브리핑에서 사라지고 별도 화면에서만 보이는 아카이브 모델**로 다시 바뀜 — 실사용 중 사용자가 과제/메모를 완료함(과거 완료 이력)으로 따로 모아 보고 싶어함. `RoutineCard`/`DeadlineItem`의 `--done` 취소선 modifier는 이번에 제거(과제는 더 이상 완료 상태로 제자리에 남지 않으므로).

- [x] `supabase/migrations/0002_memos_completed.sql` — `memos` 테이블에 `completed boolean not null default false` 추가. `tasks.completed`와 동일 패턴(별도 이력 테이블 없이 컬럼 하나). 사용자가 Supabase SQL Editor에서 직접 실행, curl로 컬럼 반영 확인
- [x] `shared/schemas.ts` — `MemoSchema`에 `completed` 추가, `MemoCreateSchema`/`MemoUpdateSchema` 동반 수정
- [x] `server/services/memoService.ts`, `taskService.ts` — `listMemos`/`listTasks`에 optional `completed` 필터 파라미터 추가(`.eq('completed', completed)`)
- [x] `server/routes/items.ts` — `GET /:type`가 `?completed=true|false` 쿼리를 파싱해 `listTasks`/`listMemos`에 전달
- [x] `server/services/briefingService.ts` — `getBriefing()`의 tasks·memos 조회에 `completed=false` 필터 재도입(완료 항목이 브리핑에서 사라지도록) — 7/21에 "하단 정렬" 버그 수정 중 제거했던 필터를 이번엔 의도적으로 되살림
- [x] `src/api/itemsApi.ts` — `updateMemoCompleted`, `getCompletedTasks`, `getCompletedMemos` 추가
- [x] `src/components/briefing/MemoCard.tsx` — 체크박스 추가(`onToggle`), 완료 처리 시 `completed=true`로 저장 후 브리핑 재조회로 사라짐
- [x] `src/components/briefing/DeadlineItem.tsx` — 동일한 아카이브 모델에 맞춰 단순화(`checked`는 항상 `false`, 체크 시 무조건 완료 처리). `--done` 취소선 클래스 제거(index.css에서도 삭제)
- [x] `src/index.css` — `.deadline-item*` → 마감 임박·메모가 공유하는 `.check-item*`로 통합(체크박스 22px 라운드 사각형). `.memo-item`/`.memo-content`는 애초에 CSS가 정의된 적이 없어 기본 브라우저 체크박스로 보이던 버그였는데 이번에 같이 해결됨
- [x] `src/components/chat/CompletedView.tsx`(신규) — 완료된 과제·메모 목록, 항목별 **복구**(연한 파랑)/**영구 삭제**(연한 빨강) 버튼. 기존 `PATCH`/`DELETE` 엔드포인트 재사용(새 mutation 라우트 없음)
- [x] `src/types/overlay.ts` — `CompletedData` 타입 + `OverlayState`에 `'completed'` variant 추가 (기존 `'query'`와 같은 "브리핑 전체 화면 교체" 패턴)
- [x] `src/pages/BriefingPage.tsx` — `openCompletedView`(`getCompletedTasks`+`getCompletedMemos` 병렬 조회), `handleToggleMemo`, `handleRestore`, `handlePermanentDelete` 핸들러 추가. `handleToggleTask`도 로컬 낙관적 업데이트 방식에서 "API 호출 → 브리핑 재조회"로 변경(완료 시 사라져야 하므로)
- [x] `src/components/briefing/BriefingHeader.tsx` — 화면 전환 버튼 추가, **여러 차례 반복 수정**:
  1. 처음엔 토글 스위치 UI로 구현했다가 사용자 피드백으로 버튼으로 되돌림
  2. 버튼 라벨을 "완료함"에서 영문 "Completed"로, 다시 한국어 "완료"로 변경 반복
  3. 버튼 색상: 테슬라 레드(`--color-primary`) → 완료함 화면일 땐 검은색(`--color-secondary`)으로 상태 구분 → 최종적으로 흰 배경 + 어두운 텍스트로 단순화(상태는 색이 아니라 라벨 텍스트로 구분)
  4. `CompletedView`의 "브리핑으로 돌아가기" 버튼을 없애고 헤더 버튼 하나가 토글 겸용으로 동작하도록 통합(브리핑 화면=완료함으로 이동, 완료함 화면=브리핑으로 이동)
  5. 버튼을 헤더 상단 날짜 옆 → 인사말 아래로 이동, 가로로 넉넉하게 키우고 라벨을 상태별로 "완료한 Task로 이동" / "브리핑 Task로 이동"으로 확정
- [x] `server/scripts/seed.ts`, `supabase/seed.sql` — 식단에 아침(`오트밀, 바나나`) 추가(기존엔 점심·저녁만 있어 브리핑에서 아침이 빠져 보이던 문제)
- [x] `npm run typecheck && npm run lint && npm run format:check` 전체 통과 확인
- [x] curl로 종단 검증 — 과제/메모 각각 완료 → 브리핑에서 사라짐 → `?completed=true`로 완료함에 조회됨 → 복구 → 브리핑 재등장 → (과제는) 영구 삭제 → 완료함에서도 사라짐까지 확인

### 기능 A-1: 자연어 저장 파이프라인 (파싱 → 분류 → 저장 + 되묻기)

- [x] `shared/schemas.ts` — 2026-07-15 / zod 스키마 1차 정의, **2026-07-24에 재정의**: `ParseResultSchema.resolved`가 `item`(단수) → `items`(복수, 동시 생성 지원) + 상단 `intent`로 변경, `clarify`는 `item` → 느슨한 `fields` 기반 `ParseCandidateSchema`(`draft` 대신)로 변경하고 `rawInput`을 추가해 후보 선택 시 원문을 다시 보낼 수 있게 함
- [x] `src/lib/parseResultToConfirmData.ts` — 2026-07-15 / 파싱 결과 → 확인 카드 데이터 변환, **2026-07-24에 `items` 배열 처리로 갱신** (2개 이상이면 타입 라벨 합성)
- [x] `src/components/chat/ChatInput.tsx` — 2026-07-15 / 하단 상주 입력창
- [x] `src/components/chat/ConfirmOverlay.tsx` — 2026-07-15 / 확인 카드 UI, **2026-07-24에 "실행 취소" 버튼 실제 동작(`onUndo`) 연결 완료** — "수정" 버튼은 S4(상세/편집) 미정이라 여전히 `onClose`만 호출하는 의도적 미구현
- [x] `src/components/chat/ClarifyOverlay.tsx` — 2026-07-15 / 되묻기 선택지 UI, **2026-07-24에 `onSelect`가 즉시 로컬 확정 대신 선택된 후보를 그대로 부모로 올려보내도록 변경**(실제 저장은 BriefingPage가 `/api/parse/resolve` 호출로 수행)
- [x] `src/components/chat/QueryResult.tsx` — 2026-07-15 / 조회 결과 UI, 현재 `Task[]` 전용 구조 (A-2 범위, 변경 없음)

**A-1 완료 (2026-07-24)** — 아래 항목 전부 실제 Groq 호출로 검증 완료 (단순 생성/동시 생성/되묻기→선택/미지원 intent→memo 강등)
- [x] LLM 제공자를 Anthropic Claude에서 **Groq**(`groq-sdk`, 모델 `openai/gpt-oss-120b`)로 변경 — 사용자가 Groq API 키를 준비해서 결정. `server/lib/anthropicClient.ts` 삭제, `server/lib/groqClient.ts` 신설(동일한 lazy singleton 패턴). `.env`/`.env.example`/`CLAUDE.md`/`README.md`의 `ANTHROPIC_API_KEY`·"Claude API" 언급을 `GROQ_API_KEY`·"Groq API"로 전부 갱신
- [x] `server/lib/promptTemplates.ts` — 오늘 날짜(Asia/Seoul)·요일과 6개 엔티티 필드 정의를 주입하는 시스템 프롬프트 + Groq 응답 검증용 `LlmOutputSchema`(zod). Groq의 `strict:true` json_schema 모드는 임의 키 객체(`fields`)를 지원하지 않아 `response_format: {type:'json_object'}`(느슨한 JSON 보장)를 쓰고, 프롬프트에 정확한 출력 형식을 직접 명시 + 이후 각 `*CreateSchema`로 재검증하는 이중 안전망으로 대응
- [x] `server/services/parseService.ts` — `parseText()`(Groq 호출 → 저장 또는 되묻기 후보 반환), `resolveCandidate()`(되묻기 선택 시 Groq 재호출 없이 바로 저장, `saveResults` 공유). intent는 이번 pass에서 **create(6종) + complete(루틴만)** 만 실제 처리 — update/delete/query 및 특정 안 되는 completion은 원문을 memo로 저장하는 동일한 안전망으로 강등(파싱 실패와 동일 취급)
- [x] 파싱 실패/미지원 intent → memo 강등 — `fallbackToMemo()`, plan.md 3.1.5 원칙 그대로 "미지원 기능"에도 적용
- [x] `server/routes/parse.ts` — `POST /api/parse`(원문 파싱), `POST /api/parse/resolve`(되묻기 후보 확정 저장) 둘 다 구현, 에러는 `{ error: { code, message } }`
- [x] `server/index.ts`에 `parse` 라우트 등록
- [x] `src/api/parseApi.ts` — `parseText`/`resolveCandidate` 래퍼. `src/api/itemsApi.ts`에 `deleteItem`(실행취소용) 추가
- [x] `src/pages/BriefingPage.tsx` — `handleSend`/`handleClarifySelect`/`handleUndo` 실 연동. 개별 카드 수동 병합 대신 저장 성공 시 `getBriefing()`으로 전체 재조회(루틴 순환 등 서버 로직 중복 구현 회피)
- [x] "다음주 화요일 오후 3시 팀플 회의, 전날 알려줘" 동시 생성 — `saveResults`가 reminders를 나중에 저장하며 같은 배치의 non-reminder 항목 id로 `targetId` 자동 연결. curl로 실제 검증(리마인더가 방금 만든 일정의 진짜 id를 참조함)
- [x] 모호한 입력("운동") → 되묻기 → 후보 선택(`/api/parse/resolve`) → 확인 카드까지 실 데이터 종단 검증 완료
- [ ] `src/mocks/responses.ts` — 이미 삭제된 지 오래(디렉토리 자체가 없음), stale 항목
- [ ] task 완료(intent=complete, type=tasks)는 이번 pass에서 제외 — update/delete와 동일한 "대상 검색" 문제라 A-3(P1) 범위로 남김
- [ ] query intent(예: "이번 주 마감 뭐 있어?")는 이번 pass에서 제외 — A-2(P1) 범위, 현재는 memo로 강등됨

**버그 수정 (2026-07-24, 실사용 중 발견)**
- [x] 되묻기 후보 클릭 시 아무 반응 없이 조용히 실패하던 버그 — 원인은 Groq가 후보의 `fields`에 저장 필수값(메모 `content`, 과제 `deadline`)을 안 채운 채로 후보를 내서 `/api/parse/resolve`가 500을 반환했는데 화면엔 아무 피드백도 없었음. `server/lib/promptTemplates.ts`에 "후보는 버튼 한 번으로 즉시 저장 가능해야 한다"는 규칙 추가(필수값 못 채우면 그 타입 후보 자체를 안 냄 — 예: 마감일 모르면 tasks 후보 대신 memos 후보만). `src/components/chat/ErrorOverlay.tsx` 신규 + `OverlayState`에 `error` 케이스 추가로, 저장 실패 시 이제 화면에 실제로 표시됨

---

## P1 — A-2(조회) + A-3(수정·삭제)

> P0 전 항목이 완료된 뒤에만 착수한다.

### A-2 조회

- [ ] `shared/schemas.ts`에 조회 응답 스키마 추가 — 현재 `QueryData`(제목/count/items/baseDate)는 `src/types/overlay.ts`에 FE 전용으로만 정의되어 있어 "스키마는 shared에서 한 번만 정의" 원칙과 어긋남. `ParseResultSchema`에 query 결과용 status 분기 추가 또는 별도 `QueryResultSchema` 정의 필요
- [ ] `server/lib/promptTemplates.ts` — query 의도 파싱 프롬프트 추가 (대상 엔티티/기간 조건 추출)
- [ ] `server/services/parseService.ts` — intent=`query` 분기 추가
- [x] `server/services/queryService.ts` — `filterByThisWeek()` 순수 함수 부분 완료(2026-07-24, TDD 연습 세션에서 red→green→refactor로 작성, 테스트 7케이스 `queryService.test.ts`). **단, `parseService`/`promptTemplates`에는 아직 연결 안 됨** — query intent가 들어오면 여전히 memo로 강등된다. 실제 A-2 완료로 치려면 파싱 프롬프트 연결까지 필요
- [ ] `src/pages/BriefingPage.tsx` — `MOCK_QUERY_RESPONSE` 제거, 실 `parseApi` 응답의 query 결과를 `QueryResult`에 연결
- [ ] `src/components/chat/QueryResult.tsx` — `Task[]` 전용 구조를 다른 엔티티(일정/루틴/메모 등) 조회 결과도 표시 가능하도록 확장 검토 — 타입 최소 일반화는 "P0 선행" 섹션에서 mock 기준 선구현 예정, 실 서버 query 응답 연결만 남음

### A-3 수정·삭제

- [ ] `server/lib/promptTemplates.ts` — update/delete 의도 파싱 프롬프트 추가 (제목/날짜/유형 기반 대상 식별 힌트)
- [ ] `server/services/parseService.ts` — update/delete 시 `itemsService` 조회로 대상 후보 검색, 후보 0/1/2개 이상 분기 처리
- [ ] `shared/schemas.ts` — 대상 후보 2개 이상일 때(S2-d)의 응답 스키마 추가
- [ ] `src/types/overlay.ts` — `OverlayState`에 대상 선택(S2-d) 케이스 추가
- [ ] `src/components/chat/TargetSelectOverlay.tsx`(신규) — S2-d 대상 선택 목록 UI, 아직 미착수
- [x] `server/routes/items.ts` — `GET/POST/PATCH/DELETE /api/items/:type` 6개 타입 전부 구현·curl 검증 완료 (2026-07-21, "기능 B" 섹션 참고) — 단 이건 A-3가 원래 의도한 "자연어로 대상 찾아서 수정/삭제"가 아니라 REST CRUD일 뿐. 자연어 update/delete 자체는 여전히 안 됨(memo로 강등)
- [x] `src/api/itemsApi.ts` — FE CRUD 래퍼 존재(`updateTaskCompleted`/`completeRoutine`/`deleteItem`), 완료 체크·실행취소가 사용 중
- [x] `ConfirmOverlay`의 "실행 취소"(undo) 액션 — 2026-07-24 / `handleUndo`가 저장된 항목들을 `deleteItem`으로 삭제 후 브리핑 재조회. "수정" 버튼은 여전히 미구현(S4 방식 미정)
- [ ] S4 항목 상세/편집 화면 구현 — 브리핑 카드 항목 탭 시 상세 표시 (자연어 재입력 유도 vs 간단 편집 폼, 방식 미확정 → 미확인 사항)

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
- 조회(A-2) 응답과 대상 다중 후보(A-3, S2-d) 응답을 `shared/schemas.ts`의 `ParseResultSchema`에 어떻게 확장할지 — status 분기 추가 vs 별도 스키마 분리 (참고: A-1의 `clarify.candidates`가 이미 느슨한 `fields` 기반 `ParseCandidateSchema`로 재설계됐으니, A-2/A-3도 같은 패턴을 따를지 검토)
- `react-router-dom`이 의존성에 설치되어 있으나 `App.tsx`에서 미사용 — S4(항목 상세/편집)를 별도 라우트로 만들지, 오버레이로 유지할지
- S4 항목 상세/편집 화면 구현 방식 — 자연어 재입력 유도 vs 폼 기반 편집
