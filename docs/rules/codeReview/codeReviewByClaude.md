# 코드베이스 전체 점검 (2026-07-22)

`hub/` 전체(루트 설정, `shared`, `server`, `client`, CSS, 테스트, `docs`, CI/배포)를 읽고 정리한 지적사항이다.
점검 시점에 `npm run lint`, `npm test`, `npx prettier --check .`를 실제로 실행해 확인했다.

- 테스트: client 42개 + server 49개 **전부 통과**
- ESLint: 에러 0, 경고 1건
- Prettier: 95개 파일 포맷 불일치
- 브랜치: `subTask`(작업트리에 미커밋 변경 9개 파일 존재)

> 이 문서는 지적사항 정리용이며, 이 점검 과정에서 코드는 수정하지 않았다.

---

## 심각도: 치명 (동작이 실제로 깨지거나 데이터/권한이 새는 것)

### 1. `24:00` 슬롯의 생성·제출 검증 규칙 불일치

- [x] 완료

**문제 상황:** 시간 선택 UI와 `generateSlots`는 `24:00` 칸을 생성하지만, `scheduleSlotSchema`는 `24:00`을 거부했다. 따라서 사용자가 해당 칸을 선택하면 응답 제출 API가 400을 반환했다.

**해결 방법:** `24:00`을 실제 선택 가능한 슬롯으로 사용하기로 정하고, `scheduleSlotSchema`가 `24:00`을 허용하도록 검증 규칙을 통일했다. `24:00`은 통과하고 `24:30`은 거부하는 테스트를 추가했다.

### 2. 참여자 ID가 무인증으로 전부 노출 → 남의 응답 조회·덮어쓰기·투표 마감까지 가능

- [x] 완료 (보류 결정)

**문제 상황:** 참여자 목록 API가 인증 없이 모든 `participantId`를 반환한다. 서버는 요청자가 해당 참여자 본인인지 확인하지 않으므로, ID를 이용해 다른 사람의 응답을 조회·수정하거나 관리자 ID로 약속을 마감할 수 있다.

**처리 결정:** 근본적으로 해결하려면 서버 세션을 발급하고 모든 중요 API에서 사용자와 권한을 확인해야 한다. 현재 서비스 범위에서는 인증 시스템 도입에 필요한 변경이 크므로 이번 작업에서는 보류하고 넘어간다. 실제 공개 서비스로 확장할 때 다시 검토한다.

**학습 메모:** 클라이언트가 준 id를 인가 근거로 믿으면 안 됨(IDOR) — 식별자(공개) ≠ 증명(비밀 토큰). 세션 토큰은 "그 비밀을 가졌는지"를 확인하는 것이고, 로그아웃·비번변경은 서버가 토큰을 폐기해야 확실하다(클라이언트 삭제만으론 부족).

### 3. Supabase 기본 행 제한(1000행)으로 결과 집계가 조용히 틀려질 수 있음

- [x] 완료

**문제 상황:** 서버가 `responses` 전체를 끌어와 JS로 집계했는데, PostgREST 기본 1000행 제한에 조용히 잘려(슬롯 최대 1488개) 가능/선호·완료 인원이 틀린 값이 될 수 있었다.

**해결 방법:** 집계를 DB로 옮겼다. `0005` 마이그레이션에 `group by` 집계 함수 3개를 만들고 서버는 `db.rpc()`로 결과만 받는다. 함수가 `jsonb` 한 덩어리를 반환해 1000행 제한과도 무관하다. 통합 테스트로 검증했다. (예전 구현은 `past-notes.md`)

**학습 메모:** 계산은 데이터가 있는 DB에서 한다(push computation to the data) — DB는 저장소일 뿐 아니라 계산 엔진. 필터·집계·조인은 DB, 업무 판단은 서버. 구현은 🅰 앱 SQL(직접 연결, PostgREST 우회) vs 🅱 DB 함수/RPC(마이그레이션 필요) 중 🅱 선택. RPC 결과에도 1000행 제한이 걸려 `jsonb_agg`로 회피했다.

### 4. `Modal`의 useEffect가 매 리렌더마다 포커스를 훔침
- [x] 완료
`client/src/components/Modal.tsx:22-39`의 의존성 배열이 `[open, onClose]`인데,
**모든 호출부가 `onClose`를 인라인 화살표 함수로 넘긴다**
(`AppointmentPage.tsx:54`, `ScheduleEditor.tsx:127`, `AdminDashboard.tsx:132`, `DateRangeField.tsx:79`, `ResultHeatmap.tsx:85`).
따라서 부모가 리렌더될 때마다 `onClose` 참조가 바뀌어 effect가 cleanup → 재실행된다.

cleanup에 `triggerRef.current?.focus()`가 있으므로 **리렌더마다 포커스가 트리거로 튀었다가 모달 카드로 다시 잡힌다.**
실제로 `DateRangeField`의 달력에서 날짜를 클릭하면 `onChange` → 부모 `setValue` → `watch` 리렌더가 일어나므로 매 클릭마다 포커스가 튄다.
react-day-picker의 키보드 탐색이 사실상 동작하지 않고, 향후 모달 안에 입력 필드를 넣으면 타이핑 중 포커스가 빠진다.
`onClose`를 `useCallback`으로 감싸거나 effect에서 ref로 참조하는 형태가 필요하다.

### 5. `delete` → `insert` 사이 실패 시 응답 영구 소실

- [x] 완료

**문제 상황:** `server/src/routes/responses.ts:122-134`. delete 성공 후 insert가 실패하면 참여자의 기존 응답이 전부 사라진 채 500을 받는다.
`1주차-Day4` 체크리스트 46행에 "허용"으로 적혀 있으나, 지금은 마감 후 수정이 막혀 있어 **한 번 날아가면 마감 전까지만 복구 가능**하고 마감 직전이면 영구 손실이다.

**해결 방법:** `0006` 마이그레이션에 `submit_response` DB 함수를 만들어 delete·insert를 한 트랜잭션으로 묶었다(`server/src/lib/responses.ts`가 `db.rpc()`로 호출). insert가 실패하면 delete까지 자동 롤백된다. 실제 Supabase에 대고 insert를 일부러 실패시켜 기존 응답이 그대로 남는지 확인하는 통합 테스트를 추가했다(`responses.integration.test.ts`).

---

## 심각도: 높음

### 6. 다른 브라우저 사용자가 남의 세션을 그대로 물려받음

- [x] 완료

**문제 상황:** `client/src/lib/useJoinAppointment.ts:36-40` — localStorage에 해당 약속 세션이 있으면 **입력한 이름/비밀번호를 검증하지 않고 즉시 성공 처리**한다.
`/join`에서 다른 사람이 같은 브라우저로 같은 링크를 넣고 자기 이름을 치면 앞사람의 participantId로 로그인된다.

**해결 방법:** 세션이 있어도 건너뛰지 않고 매번 `POST .../participants`를 호출하도록 바꿔서, 서버가 이름에 매칭되는 비밀번호를 항상 재검증하게 했다(`server/src/routes/participants.ts:50-51`). 관련 컴포넌트 테스트도 재인증 흐름에 맞게 수정했다(커밋 `a6372718`).


### 7. `deadline` 기능이 완전히 죽어 있음

- `client/src/pages/NewAppointmentPage.tsx:60-68`에서 입력받아 DB(`appointments.deadline`)에 저장하지만,
- 서버 어디에서도 검증하지 않고(`responses.ts`는 `closedAt`만 봄),
- `AppointmentDetailResponse`(`shared/src/appointments.ts:39-48`)에 필드 자체가 없어 FE가 되읽을 수도 없다.

사용자에게 "선택한 날짜 자정까지 응답을 받아요"(`NewAppointmentPage.tsx:108`)라고 **표시는 하는데 실제로는 아무 일도 일어나지 않는다.** 거짓 안내다.
또 `${nextDay}T00:00:00`처럼 타임존 없는 문자열을 `timestamptz`에 넣어 서버 TZ 해석에 의존한다.

### 8. 존재하지 않는 약속 ID에 대한 응답 코드가 제각각

- `GET /:id/results`(`results.ts:49-53`), `PUT .../responses`(`responses.ts:87-91`) → `getAppointmentDetail`이 "없음"과 "DB 오류"를 모두 `null`로 뭉개서 **404여야 할 상황에 500**을 반환
- `GET /:id/response-status`, `GET /:id/participants` → 약속 존재 확인을 아예 안 해서 없는 id에도 **200 + 빈 결과**
- `GET /:id`만 정상적으로 404

`getAppointmentDetail`이 `null | 'not_found' | 'error'`를 구분하도록 바꾸는 것이 근본 해결이다.

### 9. 4자리 PIN에 대한 브루트포스 방어 없음

`server/src/routes/participants.ts`의 비밀번호 검증에 rate limit이 없다.
조합이 10,000개뿐이고 bcrypt(rounds=10)라 한 번에 약 100ms지만 병렬로 돌리면 짧은 시간에 뚫린다.
최소한 IP/참여자 단위 시도 제한이 필요하다. `helmet`, rate limiter, `express.json({ limit })` 등 기본 하드닝이 전부 없다.

### 10. 정원 검사에 TOCTOU 경쟁 조건

`server/src/routes/participants.ts:64-78`은 count 조회 후 insert한다. 동시 요청이면 둘 다 통과해 정원을 초과한다.
DB 레벨 제약이나 원자적 처리(RPC)가 필요하다.

### 11. `express.json()` 기본 100kb 제한에 걸릴 수 있음

`server/src/app.ts:15`. 31일 × 48슬롯 = 1488개를 `availableSlots` + `preferredSlots` 양쪽에 모두 담으면 JSON이 대략 110KB로 기본 한도를 넘겨 **413**이 난다.
zod는 2000개까지 허용하도록 되어 있어(`shared/src/schedule.ts:17-18`) 스키마 상한과 실제 한도가 어긋나 있다.

### 12. Vercel 배포 설정이 유효한지 확인 필요

`vercel.json`이 `services` 키로 frontend/backend 2개를 선언하지만, 이는 표준 `vercel.json` 스키마가 아니다.
`.vercel/repo.json`은 프로젝트 디렉터리를 `"."` 하나로 잡고 있고, 최근 커밋 5개 중 4개가 `fix: update vercel.json` / `export default 추가`인 것으로 보아 아직 안 붙은 상태로 보인다.

- `server/src/index.ts`는 `app.listen()`을 호출하는 상시 서버 형태라 서버리스 환경과 맞지 않는다.
- `VITE_API_BASE_URL`이 `client/.env.example`과 `client/src/vite-env.d.ts`에 선언돼 있는데 **코드 어디서도 안 쓴다.** 모든 호출이 상대경로 `/api/...`라 같은 오리진 라우팅이 반드시 성립해야 한다.

---

## 심각도: 보통 (품질·일관성·리팩토링)

### 13. 죽은 코드 / 안 쓰는 의존성

- **`client/src/lib/supabase.ts` 전체가 죽은 코드다.** 아무도 import하지 않고, import되는 순간 env가 없으면 `throw`한다(모듈 최상위 throw라 앱 전체가 죽음). FE는 전부 BE 경유로 통신하므로 파일과 `VITE_SUPABASE_*` 변수, `@supabase/supabase-js` 의존성을 같이 정리 대상.
- `@tanstack/react-query`가 `client/package.json:15`에 있는데 **사용처 0건**. 그런데 `CLAUDE.md`의 "라이브러리" 항목엔 사용 중인 것으로 적혀 있다 → 문서와 실제 불일치.
- `docs/rules/subTasks.md` / `subTask1.md`가 확정 설계로 못박은 `rc-slider`는 결국 도입되지 않았고, `TimeRangeSlider.tsx`는 이름만 Slider이고 실제로는 `<select>` 2개다. 컴포넌트명이 구현과 어긋난다.

### 14. 커스텀 fetch 훅 6개가 같은 보일러플레이트를 반복

`useAppointmentDetail` / `useCompletionStatus` / `useMyResponseStatus` / `useParticipantsStatus` / `useScheduleResponse` / `useScheduleResult`가 모두 `isLoading` + `error` + `cancelled` 패턴을 그대로 복사하고 있다.
캐싱·중복요청 제거·리페치가 전혀 없어서, 예를 들어 관리자 대시보드는 마감 후에도 `completedCount`를 다시 안 불러온다(`useResponseStatus.ts:17`의 override로 눈속임).

**이미 설치돼 있는 react-query로 걷어내면 6개 훅이 훅 3~4개 + 쿼리키로 줄어든다.** 이 코드베이스에서 가장 효과가 큰 리팩토링이다.

### 15. 그리드 렌더링 코드/CSS의 대규모 중복

- `ScheduleGrid.tsx:138-188`과 `ResultHeatmap.tsx:38-83`이 표 뼈대(날짜축/시간축 추출, `label.indexOf('(')`로 두 줄 분리, sticky 시간 컬럼)를 거의 그대로 복제
- `ScheduleGrid.css`와 `ResultHeatmap.css`는 클래스 접두사만 다르고 **약 90%가 동일**
- `AdminDashboard.css`의 `.participant-status-list__badge`와 `ParticipantDashboard.css`의 `.my-response-status__badge`도 동일한 배지 스타일 중복
- `AdminDashboard.tsx`와 `ParticipantDashboard.tsx`의 상단부(헤더 · 참여현황 · 참여링크 · 투표/결과 버튼)도 거의 동일 — 공통 `DashboardSummary` 추출 여지

→ 공통 `SlotGrid` 컴포넌트 + 공통 `.slot-grid` CSS로 묶는 것이 자연스럽다.

### 16. 서버 테스트 4개 파일이 `createQueryBuilder`를 그대로 복붙

`appointments.test.ts` / `participants.test.ts` / `responses.test.ts` / `results.test.ts` 모두 동일한 mock 빌더를 각자 정의한다(`results.test.ts`만 `update`/`in`이 추가된 변종).
`integrationHelpers.ts`처럼 `testHelpers.ts`로 뽑아낼 자리다.

### 17. 빌드 산출물에 테스트가 섞임

`server/tsconfig.json`이 `include: ["src"]`만 있어 `npm run build` 결과 `server/dist/`에 `app.test.js`, `*.integration.test.js` 등이 그대로 들어간다(실제 존재 확인).
`exclude: ["src/**/*.test.ts"]`가 필요하다.

### 18. ESLint가 `shared/`를 전혀 검사하지 않음

`eslint.config.js`의 config 블록이 `client/**/*.{ts,tsx}`와 `server/**/*.ts` 뿐이다.
**`shared/src/`는 어떤 규칙도 적용받지 않는다** — API 계약의 단일 출처인데 린트 사각지대다.
루트 `eslint.config.js`, `*.config.ts`도 마찬가지.

### 19. Prettier 미적용 파일 95개

`npx prettier --check .` 결과 **95개 파일이 포맷 불일치**다. `.prettierrc`와 `format` 스크립트는 있는데 실제로는 안 돌리고 있다.
지금 한 번 돌리면 diff가 거대해지므로, 커밋 전 훅(lint-staged 등)이나 CI 체크를 도입할지 먼저 정하는 것이 좋다.

### 20. CI에 lint/test가 없고, auto-merge가 위험함

`.github/workflows/auto-merge.yml`이 유일한 워크플로인데 **테스트를 돌리지 않고** 매일 13:00 UTC에 조건만 맞으면 머지한다.

- `isConflicting`이면 **PR을 close** 한다(파괴적 — 작업 유실 위험)
- `main` 타겟 PR은 스킵하면서 매일 "main 브랜치로 병합 시도" 코멘트를 남긴다 → 오래 열린 PR에 코멘트 수십 개 누적
- `skipReviewLabel(pr)`은 본문이 비어 있고 인자도 안 쓰는 빈 함수
- 애초에 PR 검증 워크플로(lint/build/test)가 없어서 깨진 코드가 자동 머지될 수 있음

### 21. 클라이언트 라우팅 예외 처리 부재

- `client/src/App.tsx`에 `path: '*'`(404) 라우트가 없다
- Error Boundary가 없어 렌더 에러 시 흰 화면
- 존재하지 않는 `/a/:id`로 들어가면 참여 폼이 그대로 뜨고, 이름/비밀번호를 다 입력해야 "존재하지 않는 약속이에요"를 알게 된다

### 22. 이름 trim 처리가 생성/참여 간 불일치

`joinAppointmentRequestSchema`(`shared/src/participants.ts:6`)는 `.trim()`을 하지만
`createAppointmentRequestSchema`의 `creatorName`(`shared/src/appointments.ts:16`)에는 없다.

방장이 `" 철수"`로 만들면 나중에 `"철수"`로 재접속할 때 **동일인이 아닌 신규 참여자로 취급**된다(`unique(appointment_id, name)`도 서로 다른 값으로 봄).
`docs/rules/plan/plan.md` 6항("앞뒤 공백을 제거한 후 중복 확인")에도 어긋난다.
`title`, `headcount` 상한 부재도 같은 계열.

### 23. express 에러 처리 미들웨어 / 404 핸들러 없음

`server/src/app.ts`에 4-arity 에러 핸들러가 없어 라우트에서 던져진 예외는 Express 기본 HTML 에러 페이지로 나간다.
없는 `/api/*` 경로도 JSON이 아닌 HTML 404를 반환해 FE의 `err.response.data?.fields` 처리와 형식이 어긋난다.
`morgan('dev')`가 프로덕션·테스트에서도 그대로 켜져 있어 테스트 출력이 로그로 뒤덮인다(실제 확인).

### 24. 접근성 (subTask4에서 "후순위"로 미뤄둔 항목들, 아직 미처리)

- `client/src/index.css`에 `:focus-visible` 스타일이 전혀 없다. 키보드 사용자는 지금 어디에 포커스가 있는지 알 수 없다.
  (`docs/rules/checklist/subTask5.md:53`이 `result-cell`에 `:focus-visible`을 넣으라고 명시했는데 `ResultHeatmap.css`에 없다 — **미이행**)
- `prefers-reduced-motion` 대응 없음(`transition-slide-up` / `fade-in`이 모든 화면에 적용됨)
- 히트맵이 파란색 명도만으로 구분된다(색약 접근성). 셀에 숫자/패턴 보조 표시 없음
- `Modal`에 focus trap이 없어 Tab으로 모달 밖 요소에 접근 가능
- `CopyLinkBox`의 복사 버튼에 `aria-label` 없음(텍스트가 "복사"라 치명적이진 않음)
- 빈 상태(참여자 0명, 결과 없음) UI 없음

### 25. 사소한 성능

- `ScheduleEditor.tsx:42`, `ResultHeatmap.tsx:24`의 `visibleDates.includes(slot.date)`가 O(n × 7). 슬롯 1488개면 1만 회/렌더. `Set`으로 바꾸면 된다
- `useScheduleResponse` / `useScheduleResult`가 `generateSlots`를 `useMemo` 없이 매 렌더 재계산한다(`usePagedDateRange.ts:17-19` 주석이 이 사실을 우회하는 코드를 이미 갖고 있음 — 원인을 고치는 편이 낫다)
- `ScheduleGrid.tsx:46`의 `useRef({...})`는 렌더마다 객체 리터럴 4개 클로저를 만들어 버린다(useRef가 첫 값만 씀)

---

## 심각도: 낮음 (문서·정리)

### 26. 문서와 구현 불일치

- **`docs/rules/checklist/subTask5.md`의 완료 기준 7개가 전부 `- [ ]` 미체크**인데 작업은 다 되어 있다(작업트리 diff 확인). `subTask2.md`의 9번(통합 확인)도 미체크
- `subTasks.md`가 확정한 `rc-slider` → 실제는 `<select>` (13번 항목)
- `subTasks.md` 9·46행: 응답마감을 "날짜 + 시간 모두 선택"하게 하라고 했으나 실제는 날짜만 받고 `T00:00:00` 하드코딩
- `docs/rules/design/design.md:47`은 드래그를 **"시작 셀부터 끝 셀까지 사각형 범위"** 로 정의했는데, `ScheduleGrid.tsx`는 지나간 셀만 칠하는 경로(path) 방식이다. 53행의 "하단 요약 영역에 `날짜 · 시작~종료` 표시"도 미구현
- `docs/rules/plan/plan.md`의 미구현 항목: 4항 "참여 기록 삭제 / 약속 수정", 11항 "이미 사용 중인 이름이에요..." 중복 이름 안내(현재는 그냥 401 "비밀번호가 일치하지 않아요"로 나가서 동명이인이 원인 파악 불가), 13항 관리자 비밀번호 분실 안내
- `CLAUDE.md`의 라이브러리 목록에 react-query가 사용 중으로 기재

### 27. `README.md`가 링크 3줄뿐

클론 후 실행 방법(`npm i` → `.env` 생성 → 마이그레이션 적용 순서 → `npm run dev`), 포트, 워크스페이스 구조, 테스트/통합테스트 실행법이 하나도 없다.
`server/db/migrations`는 수동 적용 전제인데 그 절차도 어디에도 안 적혀 있다.

### 28. `.gitignore`의 `.env*`가 `.env.example`도 매칭

`client/.env.example`, `server/.env.example`은 이미 추적 중이라 지금은 문제없지만, 새 예시 파일을 추가하면 조용히 무시된다.
`!.env.example` 예외를 넣는 것이 안전하다.

### 29. 마이그레이션 운영

- 4개 파일 모두 `enable row level security`만 하고 **정책(policy)을 하나도 만들지 않았다.** 서버가 service_role 키를 써서 우회하니 현재는 동작하지만, 의도가 "전부 차단"인지 주석이 없다. anon 키가 FE에 들어 있던 흔적(13번)과 합치면 혼란의 소지
- `0004_add_closed_at.sql`에 `if not exists`가 없어 재실행 시 실패
- 적용 여부를 추적하는 테이블/도구가 없어 어느 환경에 몇 번까지 적용됐는지 알 수 없음
- 인덱스가 없다. `responses(participant_id)`, `participants(appointment_id)` 조회가 매번 풀스캔(unique 제약이 커버하는 부분 제외)

### 30. 기타 정리 대상

- `shared`의 함수(`generateSlots`, `submitResponseRequestSchema`) 테스트가 `server/src/lib/schedule.test.ts`에 있다. 소유 워크스페이스인 `shared/`에 두는 편이 맞다(현재 `shared`엔 test 스크립트조차 없음)
- `server/src/app.ts` — `export const app`과 `export default app` 이중 export, 파일 끝 개행 없음, 26~28행 빈 줄
- `ToastProvider.tsx:34`의 `useToast` export 때문에 react-refresh 경고 1건(유일한 lint 경고). `useToast`를 별도 파일로 빼면 해소
- `docs/prototype/`(HTML/CSS/JS 프로토타입)이 남아 있는데 현재 구현과 무관하다. 참고용으로 유지할지 정리할지 정하는 것이 좋다
- `.claude/settings.local.json`에 임시 스크립트 경로 허용 규칙 4개가 굳어 있다(`check-header.mjs`, `check-v7.mjs` 등)
- `client/tsconfig.app.tsbuildinfo`, `client/dist/`가 로컬에 남아 있다(gitignore돼 있어 커밋되진 않음)

---

## 우선순위

- **높음** — 1(24:00 제출 불가), 2(참여자 ID 노출로 인한 권한 우회), 3(1000행 제한으로 결과 오집계), 4(Modal 포커스), 5(응답 소실), 7(deadline 거짓 안내), 12(배포 미완)
- **보통** — 6, 8~11, 13~20, 22, 23
- **낮음** — 21, 24~30

---

## 잘 되어 있는 부분

- `shared`의 zod 스키마를 FE/BE가 그대로 공유하는 구조
- `slotKey` 기반 O(1) 조회
- 순수 함수(`aggregateSlotCounts`, `rankSlots`, `calculateProgressPercent`)를 분리해 단위 테스트한 점
- mock 테스트와 실제 Supabase 통합 테스트를 `it.skip`으로 분리한 점
- 마감 API의 멱등 처리와 `closed_at` 형식 불일치(Z vs +00:00)까지 통합 테스트로 못박아 둔 점
- `usePagedDateRange`의 참조-불안정 회귀 테스트
- `// claude:` 주석으로 설계 판단 근거를 남긴 점(이 규모에서 매우 유용)
