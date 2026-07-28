# 리팩토링 정리 계획 (2026-07-27)

`docs/rules/codeReview/`의 두 리뷰 문서(Claude·Codex)를 현재 코드에 다시 대조해서,
**"지금 있는 코드·파일을 깔끔하게 정리하는 것"** 만 골라낸 문서다.

## 이 문서의 원칙

- **한다:** 죽은 코드 삭제, 중복 제거, 파일 위치·이름 정리, 설정 파일 정리
- **안 한다:** 새 기능 추가, 미구현 기능 구현, 아키텍처 재설계, 라이브러리 신규 도입
- 기능 추가·미구현·사소한 버그는 **B절에 기록만 하고 넘어간다**
- `// study:` 주석은 손대지 않는다. 이동해야 하면 그대로 옮기고, 삭제되는 코드에 붙어 있으면
  `docs/rules/codeReview/past-notes.md`에 코드째로 보존한다

## 기준 상태 (2026-07-27 실측)

| 항목 | 결과 |
| --- | --- |
| `npm test` | client 42개 / server 48개 **전부 통과** |
| `npm run lint` | 에러 0, 경고 1 (`ToastProvider.tsx:34`) |
| `npx prettier --check .` | **116개 파일** 포맷 불일치 |

정리 작업 중에는 이 숫자가 기준선이다. 테스트 개수가 줄거나 에러가 생기면 그 자리에서 멈춘다.

---

## A. 지금 정리할 항목

### A-1. 죽은 코드·안 쓰는 의존성 삭제

가장 위험이 낮고 효과가 즉각적이다. 여기서 시작한다.

- `client/src/lib/supabase.ts` — **import하는 곳이 0건**. 게다가 모듈 최상위에서 `throw`하므로
  누가 실수로 import하면 앱 전체가 죽는다. 파일 삭제.
- `client/package.json`의 `@supabase/supabase-js` — 위 파일이 유일한 사용처였으므로 같이 제거.
- `client/package.json`의 `@tanstack/react-query` — **사용처 0건**. 도입 계획이 없으면 제거.
  (제거하면 `CLAUDE.md`의 라이브러리 목록도 같이 고쳐야 한다 → A-4)
- `client/src/vite-env.d.ts`의 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — 위 파일 전용 선언.
  `client/.env.example`에서도 함께 정리.
- `VITE_API_BASE_URL` — 선언만 있고 **코드 어디서도 안 쓴다**(모든 axios 호출이 상대경로 `/api/...`).
  같은 오리진 배포를 전제로 유지하기로 했으면 선언을 지우는 쪽이 정직하다.

### A-2. 중복 제거

같은 코드가 두 곳 이상에 있는 것만 모았다. 새 추상화를 발명하는 게 아니라
**이미 똑같이 생긴 것을 한 곳으로 모으는** 작업이다.

| 대상 | 현재 | 정리 방향 |
| --- | --- | --- |
| 대시보드 상단 | `AdminDashboard.tsx:56-81`과 `ParticipantDashboard.tsx:26-51`이 **줄 단위로 동일**(제목·기간·참여현황·ProgressBar·참여링크) | `DashboardSummary.tsx`로 추출 |
| 배지 CSS | `AdminDashboard.css`의 `.participant-status-list__badge`와 `ParticipantDashboard.css`의 `.my-response-status__badge`가 동일 스타일 | 공용 `.badge` 클래스 하나로 |
| 그리드 표 CSS | `ScheduleGrid.css`와 `ResultHeatmap.css`의 **앞부분 약 60줄이 접두사만 다르고 동일**(wrapper/table/corner/sticky 시간 컬럼/헤더). 뒷부분(셀 색상 modifier)만 진짜로 다르다 | 공통 `.slot-grid` CSS로 뼈대를 합치고, 셀 색상만 각 파일에 남김 |
| 그리드 표 뼈대 | `ScheduleGrid.tsx:138-188`과 `ResultHeatmap.tsx:38-83`이 날짜·시간축 추출, `label.indexOf('(')` 두 줄 분리, `<thead>`/`<tbody>` 구조를 복제 | 축 추출은 `useSlotAxes(slots)` 같은 작은 훅으로, 렌더는 CSS만 합치고 JSX는 유지(드래그 제스처가 붙은 쪽과 읽기 전용인 쪽의 성격이 달라 억지로 한 컴포넌트로 합치면 오히려 복잡해진다) |
| fetch 훅 | `useAppointmentDetail` / `useCompletionStatus` / `useMyResponseStatus` / `useParticipantsStatus` / `useScheduleResponse` / `useScheduleResult`가 `isLoading` + `error` + `cancelled` 패턴을 **6번 복사** | `useFetch<T>(url, deps, errorMessage)` 하나로 묶기. **react-query 도입은 하지 않는다**(라이브러리 신규 도입 = 큰 변경) |
| 참여자 확인 | `responses.ts:20`의 `requireParticipant`와 `results.ts:11`의 `requireAdminParticipant`가 쿼리·404 처리까지 동일하고 role 검사만 추가 | `server/src/lib/requireParticipant.ts`로 옮기고 `{ admin?: boolean }` 옵션 하나로 통합 |
| 서버 테스트 mock | `appointments.test.ts` / `participants.test.ts` / `responses.test.ts` / `results.test.ts`가 `createQueryBuilder`를 **각자 정의**(results만 `update`/`in`이 추가된 변종) | `server/src/routes/testHelpers.ts`로 추출(가장 기능이 많은 results 버전 기준) |

### A-3. 파일 위치·이름 정리

이름이 내용과 어긋나 있는 것들. 코드 동작은 안 바뀌고 import 경로만 바뀐다.

- **`server/src/lib/pgTime.ts`** — 이름은 "pg 시간 유틸"인데 실제로는 `normalizeTime`(7줄) +
  `getAppointmentDetail`(약속 조회 repository)이 같이 들어 있다.
  → `normalizeTime`만 `pgTime.ts`에 남기고, `getAppointmentDetail`·`AppointmentDetail` 타입은
  `server/src/lib/appointments.ts`로 분리.
- **`client/src/components/TimeRangeSlider.tsx`** — 이름은 Slider인데 실제 구현은 `<select>` 2개다
  (`rc-slider`는 결국 도입되지 않았다). → `TimeRangeField.tsx`로 이름 변경(`DateRangeField`와 짝이 맞는다).
- **`server/src/lib/schedule.test.ts`** — `shared`의 `generateSlots`·`submitResponseRequestSchema`를
  테스트하는데 파일이 server에 있다. → `shared/src/schedule.test.ts`로 이동.
  단 `shared/package.json`에 `test` 스크립트가 없으므로 vitest 스크립트를 같이 추가해야 한다
  (설정 추가라 A-4와 함께 판단).
- **`client/src/components/ToastProvider.tsx`의 `useToast`** — 유일한 lint 경고의 원인.
  → `client/src/lib/useToast.ts`로 분리하면 경고 0건이 된다.

### A-4. 설정·저장소 정리

- **`server/tsconfig.json`** — `include: ["src"]`뿐이라 `npm run build` 결과 `server/dist/`에
  `*.test.js`, `*.integration.test.js`, `integrationHelpers.js`가 그대로 들어간다.
  → `"exclude": ["src/**/*.test.ts", "src/**/*.integration.test.ts", "src/routes/integrationHelpers.ts"]` 추가.
- **`eslint.config.js`** — config 블록이 `client/**`와 `server/**`뿐이라 **`shared/src/`가 린트 사각지대**다.
  API 계약의 단일 출처인데 어떤 규칙도 안 받는다. → `shared/**/*.ts` 블록 추가.
- **Prettier 116개 파일** — `.prettierrc`와 `format` 스크립트는 있는데 안 돌리고 있다.
  → `npm run format`을 **한 번에 돌리고 그 커밋만 따로 분리**한다(다른 변경과 섞이면 리뷰가 불가능해진다).
  A절 작업 **맨 마지막**에 하는 게 좋다. 먼저 돌리면 이후 diff가 포맷 변경에 묻힌다.
- **`.gitignore`** — `.env*`가 `.env.example`까지 매칭한다. 지금 있는 두 파일은 이미 추적 중이라
  문제없지만 새 예시 파일은 조용히 무시된다. → `!.env.example` / `!**/.env.example` 예외 추가.
- **`.claude/settings.local.json`** — `check-header.mjs`, `check-v7.mjs` 같은 **이미 없는 임시 스크립트**
  허용 규칙 4개가 굳어 있다. → 삭제.
- **`docs/prototype/`** — 현재 구현과 무관한 HTML/CSS/JS 프로토타입. 유지할지 지울지 결정.
  (참고 가치가 있으면 `docs/prototype/README.md`에 "현재 구현과 다름"만 명시해도 충분)

### A-5. 사소한 코드 위생

한 줄~몇 줄짜리. 동작 변화 없음.

- `ScheduleEditor.tsx:43`, `ResultHeatmap.tsx:24`의 `visibleDates.includes(slot.date)` →
  `Set`으로. 슬롯 1488개면 렌더마다 약 1만 회 비교가 7회 조회로 줄어든다.
- `useScheduleResponse.ts:49`, `useScheduleResult.ts:39`의 `generateSlots(...)`가 **매 렌더 재계산**된다
  (최대 1488개 생성). → `useMemo`로 감싼다. `usePagedDateRange.ts`가 이 참조 불안정성을
  우회하는 코드를 이미 갖고 있는데, 우회 대신 원인을 고치는 쪽이 맞다.
- `ScheduleGrid.tsx:46`의 `useRef({...})` — `useRef`는 첫 값만 쓰는데 렌더마다 객체 리터럴과
  클로저 4개를 새로 만들어 버린다. (`handlers` ref도 동일)
- `server/src/app.ts` — `export const app`과 `export default app` **이중 export**, 파일 끝 개행 없음,
  26~28행 빈 줄 2개. 파일 전체가 CRLF인 점도 확인 필요.
- `server/src/app.ts:14`의 `morgan('dev')`가 테스트에서도 켜져 있어 테스트 출력이 로그로 덮인다.
  → `env`에 따라 조건부로. (동작 변화가 조금 있으니 마지막에 판단)

---

## B. 기록만 하고 넘어갈 항목

**이번 정리 범위 밖이다.** 나중에 다시 볼 때를 위해 남긴다.
근거가 필요하면 `docs/rules/codeReview/`의 원본 항목 번호를 붙였다.

### B-1. 기능 추가·미구현 (구현하려면 새로 만들어야 함)

- **인증/세션 부재** — 참여자 목록 API가 인증 없이 모든 `participantId`를 반환하고,
  서버가 요청자 본인 여부를 확인하지 않는다(IDOR). 남의 응답 조회·수정, 관리자 ID로 마감까지 가능.
  근본 해결은 서버 세션 발급 + 전 API 인가 확인 → 사실상 신규 기능. (Claude 2번 / Codex 2.1)
- **`deadline` 기능이 죽어 있음** — 입력받아 DB에 저장하지만 서버가 검증하지 않고,
  `AppointmentDetailResponse`에 필드 자체가 없어 FE가 되읽지도 못한다.
  화면에는 "선택한 날짜 자정까지 응답을 받아요"라고 표시된다(거짓 안내).
  타임존 없는 `${nextDay}T00:00:00`을 `timestamptz`에 넣는 문제도 같이 있다. (Claude 7번)
- **PIN 브루트포스 방어 없음** — 4자리 = 조합 1만개. rate limit, `helmet`,
  `express.json({ limit })` 등 기본 하드닝 전무. (Claude 9번 / Codex 3.1)
- **정원 검사 TOCTOU** — count 조회 후 insert라 동시 요청 시 정원 초과. DB 제약이나 RPC 필요. (Claude 10번)
- **`express.json()` 100kb 한도** — 31일 × 48슬롯을 available+preferred 양쪽에 담으면 약 110KB로 413.
  zod는 2000개까지 허용하므로 스키마 상한과 실제 한도가 어긋나 있다. (Claude 11번)
- **404 라우트 / Error Boundary / 빈 상태 UI 없음** — `App.tsx`에 `path: '*'`이 없고,
  렌더 에러 시 흰 화면. 참여자 0명·결과 없음 화면도 없다. (Claude 21번)
- **express 에러 핸들러 / JSON 404 핸들러 없음** — 라우트 예외가 Express 기본 HTML 페이지로 나가서
  FE의 `err.response.data?.fields` 처리와 형식이 어긋난다. (Claude 23번)
- **접근성** — `:focus-visible` 스타일 전무, `prefers-reduced-motion` 미대응,
  히트맵이 색상 단독 표현(색약), `Modal` focus trap 없음, 그리드 버튼 accessible name 없음.
  (Claude 24번 / Codex 7절)
- **CI 정비** — `auto-merge.yml`이 유일한 워크플로인데 테스트를 돌리지 않고 조건만 맞으면 머지한다.
  `isConflicting`이면 PR을 close하는 파괴적 동작, main 타겟 PR에 매일 코멘트 누적,
  본문이 빈 `skipReviewLabel` 함수. (Claude 20번 / Codex 3.10)
- **마이그레이션 운영** — 적용 여부 추적 도구 없음, RLS 정책 0개(service_role로 우회 중),
  `0004`에 `if not exists` 없어 재실행 실패, 인덱스 없음. (Claude 29번)
- **배포** — Vercel 설정과 `app.listen()` 상시 서버 형태의 정합성 확인 필요. (Claude 12번)

### B-2. 사소한 버그·불일치 (고치는 건 쉽지만 동작이 바뀜)

- **존재하지 않는 약속 ID의 응답 코드가 제각각** — `getAppointmentDetail`이 "없음"과 "DB 오류"를
  모두 `null`로 뭉개서 404여야 할 곳에 500이 나가고, `response-status`·`participants`는
  존재 확인을 아예 안 해서 없는 id에도 200 + 빈 결과. (Claude 8번 / Codex 4.5)
  → A-3에서 `pgTime.ts`를 쪼갤 때 반환 타입을 `'not_found' | 'error'`로 나누기 좋은 자리지만,
  HTTP 상태가 바뀌면 테스트도 같이 바뀌므로 이번엔 손대지 않는다.
- **이름 trim 불일치** — `joinAppointmentRequestSchema`는 `.trim()`하는데
  `createAppointmentRequestSchema.creatorName`은 안 한다. 방장이 `" 철수"`로 만들면
  `"철수"`로 재접속할 때 **동일인이 아닌 신규 참여자**가 된다. (Claude 22번)
- **관리자 진행 현황이 자동 갱신되지 않음** — `useResponseStatus`의 `closedAtOverride`가
  재조회 없이 눈속임하고 있다. (Claude 14번 / Codex 5.7)
- **중복 이름 안내 부재** — 동명이인이 참여하면 401 "비밀번호가 일치하지 않아요"만 나가서
  사용자가 원인을 알 수 없다. (Claude 26번)
- **복사 실패를 조용히 무시** / **일정 선택 2단계에서 이전 단계로 못 돌아감** (Codex 5.11, 5.8)
- **문서-구현 불일치** — `subTask5.md` 완료 기준 7개가 전부 미체크(작업은 완료됨),
  `design.md:47`의 사각형 범위 드래그 정의 vs 실제 경로(path) 방식,
  `subTasks.md`의 `rc-slider` 확정 vs 실제 `<select>`. (Claude 26번 / Codex 12절)
  → 이 중 `CLAUDE.md`의 react-query 기재만 A-1에서 함께 고친다(코드를 지우면 문서도 틀려지므로).

---

## C. 이 과정에서 공부할 만한 요소

정리 작업을 하면서 실제로 마주치는 개념만 짧게. 순서는 A절 진행 순서와 같다.

### 1. 죽은 코드는 "안 쓰는 코드"가 아니라 **부채**다 (A-1)

`client/src/lib/supabase.ts`는 아무도 안 쓰는데도 모듈 최상위에서 `throw`한다.
ES 모듈은 **import되는 순간 최상위 코드가 실행**되므로, 누가 자동완성으로 이 파일을 한 번
import하면 앱 전체가 죽는다. "안 쓰니까 놔둬도 된다"가 성립하지 않는 이유다.
→ 부수효과(side effect)를 모듈 최상위에 두지 말고 함수 안으로 넣는 것이 일반 원칙.

### 2. 중복 제거의 판단 기준 — DRY vs 성급한 추상화 (A-2)

A-2 표에서 대시보드 상단과 배지 CSS는 **줄 단위로 동일**하니 합치는 게 명확하다.
반면 `ScheduleGrid`와 `ResultHeatmap`은 표 뼈대는 같지만 한쪽엔 롱프레스 드래그 제스처가,
다른 쪽엔 클릭 모달이 붙어 있다. 억지로 한 컴포넌트로 합치면 props에 `variant`, `onToggle?`,
`onCellClick?`, `eligibleKeys?`가 다 들어와 **분기 덩어리**가 된다.
→ 기준: **"같이 변할 것"만 합친다.** 지금 우연히 똑같이 생긴 것과, 앞으로도 함께 바뀔 것은 다르다.
이 코드베이스에선 CSS(같이 변함)는 합치고 JSX(성격이 다름)는 안 합치는 판단이 나온다.

### 3. 커스텀 훅으로 보일러플레이트를 걷어내는 법 (A-2 fetch 훅)

6개 훅이 반복하는 `let cancelled = false` → `return () => { cancelled = true }` 패턴은
**언마운트 후 setState 방지** 관용구다. `useFetch` 하나로 묶으면 이 관용구가 한 곳에만 남는다.
- 왜 `useEffect`의 콜백을 `async`로 만들면 안 되는가: `async` 함수는 Promise를 반환하고,
  React는 반환값을 **cleanup 함수로 취급**하기 때문. 그래서 안쪽에 `async function load()`를 두고 호출만 한다.
- `cancelled` 플래그 대신 `AbortController`를 쓰면 요청 자체를 취소할 수 있다(현재는 응답을 버리기만 함).
- react-query가 해주는 것: 캐싱, 중복 요청 제거(dedup), 자동 리페치, 스테일 관리.
  이번엔 도입하지 않지만 **`useFetch`를 직접 만들어 보면 react-query가 뭘 대신해주는지가 보인다.**

### 4. 파일 이름과 책임의 일치 (A-3)

`pgTime.ts`에 약속 조회 repository가, `TimeRangeSlider.tsx`에 `<select>` 2개가 들어 있다.
둘 다 "처음 만들 때의 계획"이 이름에 화석처럼 남은 경우다.
→ 이름이 내용을 배신하면 **읽는 사람이 파일을 열기 전에 잘못된 가정을 한다.**
리팩토링에서 rename은 가장 값싸고 효과 큰 조작이다(동작 변화 0, 이해도 상승).

### 5. Fast Refresh와 모듈 export 규칙 (A-3 `useToast`)

유일한 lint 경고 `react-refresh/only-export-components`의 의미:
Vite의 Fast Refresh는 **파일 단위로 컴포넌트를 교체**한다. 한 파일이 컴포넌트와 훅을 같이 export하면
그 파일을 수정할 때 Fast Refresh가 상태를 보존할지 판단할 수 없어 전체 리로드로 후퇴한다.
→ 훅·상수는 별도 파일로. 린트 경고가 "스타일 취향"이 아니라 **도구의 동작 조건**을 알려주는 사례.

### 6. 빌드 산출물과 테스트 코드의 분리 (A-4 tsconfig)

`server/dist/`에 테스트 파일이 들어간다는 건, 프로덕션 번들에 **테스트용 mock과 실제 DB에 붙는
integration helper가 배포된다**는 뜻이다. 크기 문제보다 공격면(attack surface) 문제가 크다.
→ 일반 패턴: `tsconfig.json`(빌드, 테스트 제외) + `tsconfig.test.json`(테스트 포함)으로 분리.

### 7. 포맷 커밋은 반드시 따로 (A-4 Prettier)

116개 파일 포맷 변경을 로직 변경과 같은 커밋에 넣으면 diff에서 **로직 변경을 찾을 수 없다.**
→ 원칙: **"기계적 변경"과 "의미 있는 변경"은 다른 커밋으로.**
`git blame` 오염을 줄이려면 `.git-blame-ignore-revs`로 포맷 커밋을 blame에서 제외할 수 있다.
근본 방지는 커밋 전 훅(lint-staged)이나 CI 포맷 체크지만, 그건 신규 도입이므로 이번엔 수동 1회.

### 8. `Set` vs `Array.includes` — 상수 배열이면 안 바꿔도 된다 (A-5)

`visibleDates.includes(...)`는 O(n)이지만 `visibleDates`는 7개다. 진짜 문제는
**1488개 슬롯을 `filter`하며 매번 7개를 훑는 곱셈**(약 1만 회)이라는 점.
→ 교훈: 복잡도는 항상 **"무엇 안에서 반복되는가"** 를 같이 봐야 한다. `includes` 자체가 죄가 아니다.

### 9. `useRef(초기값)`의 초기값은 매 렌더 계산된다 (A-5)

`useRef({...})`는 첫 렌더의 값만 저장하지만, **인수 표현식은 매 렌더 평가된다.**
`ScheduleGrid.tsx`는 이 때문에 렌더마다 객체와 클로저 4개를 만들고 즉시 버린다.
→ `useState`의 lazy initializer(`useState(() => f())`)와 달리 `useRef`엔 lazy 형태가 없다.
비싼 초기값이면 `if (ref.current === null) ref.current = ...` 패턴을 쓴다.
(참고: `ScheduleGrid`의 `handlers` ref가 **매 렌더 같은 함수 참조**를 유지해야 하는 이유는
`addEventListener`/`removeEventListener`에 동일 참조를 넘겨야 리스너가 실제로 제거되기 때문이다.
ref로 최신 상태를 읽는 이 구조 자체는 의도된 설계다 — 초기값 낭비만 고친다.)

### 10. 리팩토링의 안전망은 테스트다

A절 전체가 "동작 변화 없음"을 전제로 한다. 그걸 보장하는 건 **기준 상태의 테스트 90개**다.
→ 리팩토링 정의: **외부 동작을 바꾸지 않으면서 내부 구조를 개선**. 동작이 바뀌면 그건 리팩토링이 아니라
기능 변경이고, 커밋도 따로 나가야 한다. B절 항목들이 전부 "넘어감"인 이유가 이것이다.

---

## 우선순위

- **높음** — A-1(죽은 코드·안 쓰는 의존성), A-4의 `server/tsconfig.json` 테스트 제외,
  A-3의 `useToast` 분리. 위험이 거의 없고 실질적 문제(앱 죽을 수 있는 dead module,
  프로덕션 번들에 테스트 배포, lint 경고)를 없앤다.
- **보통** — A-2(중복 제거) 전체, A-3의 나머지(`pgTime` 분리, `TimeRangeSlider` 이름 변경,
  shared 테스트 이동), A-4의 eslint `shared` 추가.
  코드가 실제로 움직이므로 테스트 90개를 매 단계 돌리면서 진행한다.
- **낮음** — A-5(사소한 위생), A-4의 Prettier 일괄 적용·`.gitignore`·`settings.local.json`·
  `docs/prototype/` 정리. Prettier는 순서상 **가장 마지막**이다.

## 제안 진행 순서

1. A-1 죽은 코드·의존성 삭제 (+ `CLAUDE.md` 라이브러리 목록 수정)
2. A-4 중 `server/tsconfig.json`, `eslint.config.js`, `.gitignore`
3. A-3 이름·위치 정리 (`useToast` → `pgTime` 분리 → `TimeRangeSlider` rename → shared 테스트 이동)
4. A-2 중복 제거 (테스트 헬퍼 → `requireParticipant` → 배지·그리드 CSS → `DashboardSummary` → `useFetch`)
5. A-5 사소한 위생
6. **마지막에** `npm run format` 단독 커밋
