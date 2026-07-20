# 주간 개발 계획 (2026-07-20~07-25)

**목표:** 프론트-백엔드 연동 완료 + 안정화 — 프로필·리셋·작업목록 경로 닫기, 테스트 환경 구축, 아키텍처 문서화

## 이슈 목록

| # | 레이어 | 작업 | 의존 | 상태 |
|---|---|---|---|---|
| 8 | 설정 | `concurrently` 추가 — 루트 `npm run dev`로 FE+BE 동시 실행 | — | [ ] |
| 9 | FE·BE | "체크 상태 초기화" → `POST /api/progress/reset` 연결 | — | [ ] |
| 10 | 설정 | 테스트 환경 구축 — Vitest(FE) + Supertest(BE) | — | [ ] |
| 11 | 데이터 | `tasks.ts` sourceUrl 딥링크 개선 — 각 항목을 정확한 하위 페이지로 | — | [ ] |
| 12 | BE | `/api/profile` 응답 shape 확인 — `closureDate` 형식 정규화 | — | [ ] |
| 13 | FE·BE | 온보딩 제출 → `POST /api/profile` 연결 + 제출 버튼 로딩 **(TDD)** | 12, 10 | [ ] |
| 14 | FE | 대시보드 진입 → `GET /api/profile` 연결, `useLocalStorage` 제거 **(TDD)** | 13 | [ ] |
| 15 | BE·FE | `GET /api/tasks` 구현 (profile 기반 필터링) + 프론트 연결 **(TDD)** | 14 | [ ] |
| 16 | FE | 에러 배너 + 초기 로딩 스켈레톤 | 14 | [ ] |
| 17 | 문서 | 아키텍처 다이어그램 — 구조·데이터 흐름을 Mermaid로 시각화 | 14, 15 | [ ] |
| 18 | 통합 | 전체 플로우 수동 QA + 자동 테스트 실행 | 15, 16, 11 | [ ] |

## 진행 순서

```
#8  (concurrently) ──────────────────────────────────── 독립, 먼저 처리
#9  (reset 연동) ────────────────────────────────────── 독립, 먼저 처리
#10 (테스트 환경) ───────────────────────────────────── 독립, 먼저 처리
#11 (URL 딥링크) ────────────────────────────────────── 독립, 먼저 처리

#12 (API shape 검증)
  └─→ #13 (POST /api/profile 연결 + 테스트) ← #10 의존
        └─→ #14 (GET /api/profile 연결 + 테스트)
              ├─→ #15 (GET /api/tasks + 테스트)
              ├─→ #16 (에러/로딩 UX)
              └─→ #17 (아키텍처 다이어그램)
                         └─→ #18 (통합 QA) ← #11, #15, #16 모두 완료 후
```

## 스코프 밖 (이번 주 안 함)

- `reason(profile)` / `dueDate(profile)` 서버 이식 (공유 패키지 구조 결정 전까지 보류)
- 모바일 반응형 개선
- 배포 (Week 3)
- E2E 자동화 (Playwright)

---

## 이슈 상세

### #8 `[설정]` concurrently 추가

**변경 파일:** `package.json` (루트)

**진행 순서**
1. `npm install -D concurrently` (루트)
2. `package.json` scripts 수정:
   ```json
   "dev": "concurrently -n FE,BE -c cyan,yellow \"vite\" \"npm run dev --prefix server\"",
   "dev:fe": "vite"
   ```

**완료 조건**
- 루트 `npm run dev` 하나로 5173/4000 동시 기동
- 로그에 `[FE]`/`[BE]` 접두어가 색상으로 구분됨
- `npm run dev:fe`로 프론트 단독 실행 가능

---

### #9 `[FE]` 체크 상태 초기화 → 서버 연결

**변경 파일:** `src/App.tsx`

**진행 순서**

`handleResetProgress()` 교체 (`App.tsx` 58-60행):
```ts
async function handleResetProgress() {
  await fetch('http://localhost:4000/api/progress/reset', {
    method: 'POST',
    credentials: 'include',
  }).catch(() => {})
  setProgress({})
}
```

**완료 조건**
- 체크 항목 있는 상태에서 "체크 상태 초기화" 클릭 → Network 탭 `POST /api/progress/reset` 204 확인
- 새로고침 후에도 체크 상태 비어있음 (`GET /api/progress` → `{}`)

---

### #10 `[설정]` 테스트 환경 구축

**전략:** 프론트는 Vitest + React Testing Library, 백엔드는 Vitest + Supertest. E2E(Playwright)는 스코프 밖.

**변경 파일:** `package.json`(루트), `vite.config.ts`, `server/package.json`

**진행 순서**
```bash
# 루트 (FE 테스트)
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom

# server/ (BE 테스트)
cd server && npm install -D vitest supertest @types/supertest
```

`vite.config.ts`에 test 설정 추가:
```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: './src/test/setup.ts',
}
```

smoke test 파일 생성:
- `src/test/App.test.tsx` — App 컴포넌트 마운트 확인
- `server/src/test/health.test.ts` — `GET /api/health` 200 확인

**완료 조건**
- 루트 `npm test` 실행 시 FE 테스트 통과
- `server/` 에서 `npm test` 실행 시 BE 테스트 통과

---

### #11 `[데이터]` tasks.ts sourceUrl 딥링크 개선

**변경 파일:** `src/data/tasks.ts`

각 항목의 `sourceUrl`을 홈페이지 루트 → **해당 업무의 정확한 하위 페이지**로 교체.

| taskId | 현재 URL | 개선 방향 |
|---|---|---|
| `business-closure-report` | `hometax.go.kr` | 홈택스 폐업신고 메뉴 직링크 |
| `insurance-loss-report` | `4insure.or.kr` | 4대보험 상실신고 안내 페이지 |
| `food-service-business-report-closure` | `gov.kr` | 정부24 식품영업 폐업신고 서비스 |
| `online-retail-report-closure` | `gov.kr` | 정부24 통신판매업 폐지신고 서비스 |
| `lease-termination` | `easylaw.go.kr` | 임대차 해지 관련 생활법령 페이지 |
| `vat-final-return` | `hometax.go.kr` | 홈택스 부가세 신고 메뉴 |
| `income-tax-return` | `hometax.go.kr` | 홈택스 종합소득세 신고 메뉴 |
| `store-demolition-subsidy` | `hope.sbiz.or.kr` | 희망리턴패키지 점포철거비 안내 |
| `reemployment-program` | `hope.sbiz.or.kr` | 희망리턴패키지 교육 프로그램 안내 |

**완료 조건**
- 각 `<a>` 링크 클릭 시 해당 업무 페이지로 직접 이동 (브라우저 확인)
- `lastCheckedDate` 오늘 날짜(`2026-07-20`)로 갱신

---

### #12 `[BE]` `/api/profile` 응답 shape 확인 및 정규화

**변경 파일:** `server/src/routes/profile.ts`

`closureDate`가 ISO 8601 timestamp로 내려오면 프론트 `Profile` 타입(`"YYYY-MM-DD"`)과 불일치.

**진행 순서**
```ts
const toShape = (p: { closureDate: Date | null; [key: string]: unknown }) => ({
  ...p,
  closureDate: p.closureDate
    ? new Date(p.closureDate).toISOString().slice(0, 10)
    : null,
})
```
`GET /`와 `POST /` 응답 모두 `toShape()`로 래핑.

**완료 조건**
- `curl -b cookies.txt http://localhost:4000/api/profile` 응답의 `closureDate`가 `"2026-09-30"` 형식
- `POST /api/profile` 응답도 동일 형식

---

### #13 `[FE·BE]` 온보딩 제출 → `POST /api/profile` 연결 (TDD)

**변경 파일:** `src/App.tsx`, `src/components/OnboardingForm.tsx`

**TDD 순서**
1. `src/test/handleComplete.test.ts` 작성 — `fetch` 호출 여부 검증
2. 테스트 실패 확인
3. `handleComplete()` 구현

```ts
async function handleComplete(newProfile: Profile) {
  setProfile(newProfile)
  setIsEditingProfile(false)
  await fetch('http://localhost:4000/api/profile', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProfile),
  }).catch(() => {})
}
```

**완료 조건**
- 폼 제출 시 Network 탭에 `POST /api/profile` 200 확인
- Supabase `Profile` 테이블 행 생성/갱신 확인
- 테스트 통과

---

### #14 `[FE]` 대시보드 → `GET /api/profile` 연결, `useLocalStorage` 제거 (TDD)

**변경 파일:** `src/App.tsx`

```ts
// Before
const [profile, setProfile] = useLocalStorage<Profile | null>('profile', null)

// After
const [profile, setProfile] = useState<Profile | null>(null)

useEffect(() => {
  fetch('http://localhost:4000/api/profile', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => data?.industry && setProfile(data))
    .catch(() => {})

  fetch('http://localhost:4000/api/progress', { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => setProgress(data))
    .catch(() => {})
}, [])
```

`useLocalStorage` import 제거. `src/hooks/useLocalStorage.ts` 파일 자체는 유지.

**완료 조건**
- `localStorage.removeItem('profile')` 후 새로고침해도 Dashboard 표시됨
- `src/App.tsx`에서 `useLocalStorage` import 없음
- 테스트 통과

---

### #15 `[BE·FE]` `GET /api/tasks` 구현 + 프론트 연결 (TDD)

**전략:** `condition` 함수를 서버에 복제해 `{ taskIds: string[] }` 반환. `reason`/`dueDate` 계산은 프론트 `src/data/tasks.ts`에 유지.

**새 파일:** `server/src/data/tasks.ts` — `getFilteredTaskIds(profile)` 함수  
**새 파일:** `server/src/routes/tasks.ts` — `GET /api/tasks` 라우트  
**변경 파일:** `server/src/index.ts` — 라우터 등록  
**변경 파일:** `src/components/Dashboard.tsx` — 서버 응답 기반 필터링으로 교체

**완료 조건**
- `curl "http://localhost:4000/api/tasks?industry=요식업&isCorporation=false&hasEmployee=true&isRented=false&closureDate=2026-09-30"` 응답에 예상 taskId 포함
- Dashboard 카드 목록이 서버 응답 기반으로 렌더링됨
- `getFilteredTaskIds()` 단위 테스트 통과

---

### #16 `[FE]` 에러 배너 + 초기 로딩 스켈레톤

**변경 파일:** `src/App.tsx`, `src/components/Dashboard.tsx`, `src/components/Dashboard.css`

- `isLoadingInitial` 상태 추가 (`true` → fetch 완료 후 `false`)
- `apiError` 상태 → 화면 상단 에러 배너 (인라인, 외부 라이브러리 불필요)
- Dashboard에 `isLoading` prop 전달 → 카드 skeleton placeholder 3개

**완료 조건**
- 백엔드 종료 후 새로고침 → 에러 배너 표시, 앱 크래시 없음
- Dashboard 최초 진입 시 skeleton이 잠깐 보임

---

### #17 `[문서]` 아키텍처 다이어그램 작성

**새 파일:** `docs/architecture.md`

Mermaid 다이어그램 3개:
1. **화면 전환 흐름도** — Landing → OnboardingForm → Dashboard 조건 분기
2. **API 데이터 흐름도** — 브라우저 → React → Express → Prisma → Supabase + 쿠키 세션
3. **DB 스키마 관계도** — Session / Profile / TaskProgress 모델 관계

각 다이어그램 아래 설계 결정 이유 한국어 설명.

**완료 조건**
- GitHub에서 Mermaid 렌더링 확인
- 이슈 #14, #15 완료 후 실제 데이터 흐름 반영

---

### #18 `[통합]` 전체 플로우 수동 QA + 자동 테스트 실행

**의존:** #11, #15, #16

시나리오별 완료 조건:
1. **신규 방문:** Landing → OnboardingForm → Dashboard 전환, Supabase `Profile` 행 생성 확인
2. **재방문(새로고침):** Dashboard 바로 진입, 체크 상태 유지
3. **조건 재입력:** "조건 다시 입력" 후 제출 → Supabase `Profile.updatedAt` 갱신 확인
4. **체크 초기화:** 버튼 클릭 후 새로고침 → 체크 비어있음
5. **오프라인:** 백엔드 종료 후 접속 → 에러 배너, 앱 크래시 없음
6. **URL 링크:** 각 TaskCard "...에서 확인하기" 클릭 → 정확한 하위 페이지로 이동
7. **자동 테스트:** 루트 `npm test` + `server/ npm test` 모두 통과
