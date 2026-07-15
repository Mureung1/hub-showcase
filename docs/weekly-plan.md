# 주간 개발 계획 (2026-07-13~07-18)

**목표:** 프론트-백엔드 연동 착수 — 체크 토글 쓰기/읽기 경로 완성 (localStorage → API)

## 이슈 목록

| # | 레이어 | 작업 | 의존 | 상태 |
|---|---|---|---|---|
| 1 | 환경 | Supabase 프로젝트 생성 + DATABASE_URL 발급 | — | [x] |
| 2 | BE·DB | schema.prisma PostgreSQL 전환 + prisma:migrate | 1 | [x] |
| 3 | BE | POST /api/progress/:taskId/toggle curl 검증 (Supabase 대상) | 2 | [ ] |
| 4 | FE | mock 기반 비동기 토글 UI — 낙관적 업데이트 + isLoading | — | [ ] |
| 5 | FE·BE | mock → 실제 fetch 교체, 쓰기 경로 연결 | 3, 4 | [ ] |
| 6 | FE·BE | GET /api/progress 연결, 새로고침 후 상태 복원 | 5 | [ ] |
| 7 | 통합 | 전체 사이클 검증 + 기능 검증 Agent 작성 | 6 | [ ] |

## 진행 순서

```
이슈 1 (Supabase 준비)
    └─→ 이슈 2 (DB 전환) → 이슈 3 (BE 검증) ─┐
이슈 4 (FE mock) ──────────────────────────────┤
                                               └─→ 이슈 5 → 이슈 6 → 이슈 7
```

이슈 1~2는 순차, 이슈 3과 4는 병렬 가능, 이슈 5부터 순차.

## 스코프 밖 (이번 주 안 함)

- 프로필 저장 서버 연동 (`POST /api/profile`)
- 체크 초기화(`/reset`) FE 연결
- 에러 토스트 UI
- 배포

---

## 이슈 상세

### #1 `[환경]` Supabase 프로젝트 생성 + DATABASE_URL 발급

**작업자:** 사람 (브라우저 직접)

**진행 순서**
1. supabase.com → 회원가입/로그인
2. "New project" → 프로젝트명, DB 비밀번호 설정 (비밀번호 메모 필수)
3. 생성 완료 후 Settings → Database → Connection string (URI) 복사
4. `server/.env`에 추가:
   ```
   DATABASE_URL="postgresql://postgres:[비밀번호]@db.[프로젝트ref].supabase.co:5432/postgres"
   ```

**완료 조건**
- `server/.env`에 `DATABASE_URL`이 채워진 상태

---

### #2 `[BE·DB]` schema.prisma PostgreSQL 전환 + 마이그레이션

**의존:** #1  
**변경 파일:** `server/prisma/schema.prisma`

**진행 순서**
1. `schema.prisma` 수정:
   ```diff
   - provider = "sqlite"
   + provider = "postgresql"
   ```
2. 기존 SQLite 마이그레이션 폴더 삭제 (있다면):
   ```bash
   rm -rf server/prisma/migrations
   ```
3. `server/` 에서 실행:
   ```bash
   npm run prisma:migrate   # 마이그레이션 이름: init
   npm run prisma:generate  # Prisma Client 재생성
   ```
4. Supabase 대시보드 → Table Editor에서 테이블 3개 확인

**완료 조건**
- `server/prisma/migrations/` 아래 `init` 폴더 + SQL 파일 생성됨
- Supabase Table Editor에 `Session` / `Profile` / `TaskProgress` 테이블 3개가 보임
- `cd server && npm run dev` 실행 시 오류 없이 기동됨

---

### #3 `[BE]` BE API curl 검증 (Supabase 대상)

**의존:** #2  
**코드 변경 없음 — 검증만**

**진행 순서**
```bash
# 1. 세션 생성 + 쿠키 저장
curl -c cookies.txt http://localhost:4000/api/health

# 2. 토글 (checked: true)
curl -b cookies.txt -X POST \
  http://localhost:4000/api/progress/business-closure-report/toggle

# 3. 재토글 (checked: false)
curl -b cookies.txt -X POST \
  http://localhost:4000/api/progress/business-closure-report/toggle

# 4. 진행상태 조회
curl -b cookies.txt http://localhost:4000/api/progress
```

**완료 조건**
- 2번 응답: `{ "taskId": "business-closure-report", "checked": true }`
- 3번 응답: `{ "taskId": "business-closure-report", "checked": false }`
- Supabase Table Editor → `TaskProgress` 테이블에서 행 생성/변경 직접 확인
- 쿠키 없이 새 요청 시 독립된 빈 세션 자동 발급

---

### #4 `[FE]` mock 기반 비동기 토글 UI — 낙관적 업데이트 + isLoading

**의존:** 없음 (#3과 병렬 가능)  
**변경 파일:** `src/App.tsx`, `src/components/TaskCard.tsx`, `src/components/TaskCard.css`

**진행 순서**
1. `src/App.tsx`에 `loadingTaskId` 상태 추가 + `handleToggle` async로 교체:
   ```ts
   const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)

   const handleToggle = async (taskId: string) => {
     setProgress(prev => ({ ...prev, [taskId]: !prev[taskId] })) // 낙관적 업데이트
     setLoadingTaskId(taskId)
     try {
       await new Promise(r => setTimeout(r, 300)) // mock — 이슈 5에서 fetch로 교체
     } catch {
       setProgress(prev => ({ ...prev, [taskId]: !prev[taskId] })) // 롤백
     } finally {
       setLoadingTaskId(null)
     }
   }
   ```
2. `Dashboard`에 `loadingTaskId` prop 전달 → `TaskCard`까지 내려보내기
3. `src/components/TaskCard.tsx`에 `isLoading?: boolean` prop 추가:
   - 체크박스에 `disabled={isLoading}` 적용
   - `isLoading` 시 체크박스 옆 작은 스피너 노출
4. `TaskCard.css`에 스피너 스타일 추가 (BEM: `.task-card__spinner`, 디자인 토큰 사용)
5. 브라우저에서 클릭 → 즉시 체크 상태 전환 + 300ms 비활성화 확인

**완료 조건**
- 클릭 시 UI 즉시 반응 (낙관적 업데이트)
- 300ms 동안 체크박스 비활성화 + 스피너 노출
- `setTimeout`을 `Promise.reject()`로 바꾸면 롤백 동작 확인됨

---

### #5 `[FE·BE]` mock → 실제 fetch 교체, 쓰기 경로 연결

**의존:** #3, #4  
**변경 파일:** `src/App.tsx`

**진행 순서**
1. `handleToggle`의 `await new Promise(...)` 한 줄을 실제 fetch로 교체:
   ```ts
   const res = await fetch(
     `http://localhost:4000/api/progress/${taskId}/toggle`,
     { method: 'POST', credentials: 'include' }
   )
   if (!res.ok) throw new Error('toggle failed')
   const data = await res.json()
   setProgress(prev => ({ ...prev, [taskId]: data.checked })) // 서버 응답값으로 보정
   ```
2. 브라우저 DevTools Network 탭에서 `POST /api/progress/:taskId/toggle` 200 확인
3. Supabase Table Editor → `TaskProgress` 테이블에서 행 생성/갱신 확인

**완료 조건**
- 클릭 후 Network 탭에 `POST .../toggle` 200 응답 보임
- Supabase `TaskProgress` 테이블에 해당 행 생성/갱신 확인
- 서버 다운 상태에서 클릭 시 낙관적 업데이트 롤백 동작

---

### #6 `[FE·BE]` GET /api/progress 연결, 새로고침 후 상태 복원

**의존:** #5  
**변경 파일:** `src/App.tsx`

**진행 순서**
1. `progress` 초기값을 `useLocalStorage` → `useState({})` + `useEffect` fetch로 교체:
   ```ts
   const [progress, setProgress] = useState<Record<string, boolean>>({})

   useEffect(() => {
     fetch('http://localhost:4000/api/progress', { credentials: 'include' })
       .then(r => r.json())
       .then(data => setProgress(data))
       .catch(() => {})
   }, [])
   ```
2. `useLocalStorage`의 `progress` 관련 import 제거
3. 체크 → 새로고침 → 체크 상태 유지 확인
4. DevTools 콘솔에서 `localStorage.removeItem('progress')` 후 재로드 → 서버에서 복원 확인

**완료 조건**
- 새로고침 후 체크 상태 유지
- `localStorage`의 `progress` 키를 삭제해도 쿠키 기반으로 서버에서 복원됨
- `useLocalStorage`를 참조하는 `progress` 관련 코드가 `App.tsx`에 남아있지 않음

---

### #7 `[통합]` 전체 사이클 검증 + 기능 검증 Agent 작성

**의존:** #6  
**코드 변경 없음 — 검증 + 문서화**

**진행 순서**

시나리오 4가지를 순서대로 실행:
1. 체크박스 클릭 → Network 탭 `POST .../toggle` 200 확인 → Supabase `TaskProgress` `checked: true` 확인
2. `Cmd+Shift+R` 강제 새로고침 → 체크 상태 유지 확인
3. DevTools 콘솔에서 `localStorage.clear()` → 재로드 → 서버에서 상태 복원 확인
4. 시크릿 창 접속 → 별도 빈 상태 확인 (세션 격리)

검증 완료 후 `.claude/agents/verification-toggle-cycle.md` 작성:
- 4가지 시나리오 체크리스트 + 실제 실행 결과
- 발견된 버그 및 수정 내역

**완료 조건**
- 4가지 시나리오 전부 통과
- `.claude/agents/verification-toggle-cycle.md` 커밋
