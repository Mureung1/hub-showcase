---
name: verification-toggle-cycle
description: |
  체크 토글 전체 사이클(쓰기→DB반영→새로고침 복원→세션 격리)을 4가지 시나리오로
  검증하는 Agent. curl 자동화(시나리오 1·4)와 브라우저 수동 검증(시나리오 2·3)
  결과를 기록한다. 이슈 #7 완료 조건.
model: sonnet
tools: Bash
---

## 검증 대상

프론트(낙관적 업데이트 toggle) → 백엔드(POST /api/progress/:taskId/toggle) →
Supabase PostgreSQL(TaskProgress upsert) → 새로고침 복원(GET /api/progress) →
세션 격리(sid 쿠키 기반)까지의 전체 데이터 흐름을 검증한다.

- 프론트: `src/App.tsx` (handleToggle, useEffect GET)
- 백엔드: `server/src/routes/progress.ts` (toggle, GET)
- 세션: `server/src/middleware/session.ts` (sid 쿠키, httpOnly)
- DB: Supabase PostgreSQL / `TaskProgress(sessionId, taskId, checked)`

## 사전 조건

```bash
# 백엔드 기동
cd server && npm run dev   # http://localhost:4000

# 프론트 기동
npm run dev               # http://localhost:5173

# 서버 확인
curl http://localhost:4000/api/health
# 기대: {"ok":true}
```

---

## 시나리오 체크리스트 + 실행 결과

### 시나리오 1: 체크박스 클릭 → POST 200 → DB 반영 ✅

**검증 방법:** curl

```bash
# 세션 발급
curl -s -c /tmp/hub_cookies.txt http://localhost:4000/api/health

# 1-A: 첫 토글
curl -s -b /tmp/hub_cookies.txt -X POST \
  http://localhost:4000/api/progress/business-closure-report/toggle

# 1-B: 재토글
curl -s -b /tmp/hub_cookies.txt -X POST \
  http://localhost:4000/api/progress/business-closure-report/toggle

# 1-C: 한 번 더 토글 후 GET
curl -s -b /tmp/hub_cookies.txt -X POST \
  http://localhost:4000/api/progress/business-closure-report/toggle
curl -s -b /tmp/hub_cookies.txt http://localhost:4000/api/progress
```

**실행 결과 (2026-07-16)**

| 단계 | 기대 | 실제 |
|---|---|---|
| 1-A 첫 toggle | `{"taskId":"business-closure-report","checked":true}` | `{"taskId":"business-closure-report","checked":true}` ✅ |
| 1-B 재toggle | `{"taskId":"business-closure-report","checked":false}` | `{"taskId":"business-closure-report","checked":false}` ✅ |
| 1-C GET progress | `{"business-closure-report":true}` | `{"business-closure-report":true}` ✅ |

- [x] POST /toggle 응답 200, JSON 정상
- [x] toggle → re-toggle 시 checked 값 정확히 반전
- [x] GET /api/progress 로 마지막 상태 복원 확인

---

### 시나리오 2: Cmd+Shift+R 강제 새로고침 → 체크 상태 유지

**검증 방법:** 브라우저 수동

**절차**
1. `http://localhost:5173` 접속, 온보딩 완료 → Dashboard 진입
2. 체크박스 클릭 → DevTools Network 탭에서 `POST /api/progress/.../toggle` 200 확인
3. `Cmd+Shift+R` (캐시 무시 강제 새로고침)
4. 재로드 후 체크 상태 유지 여부 확인 (GET /api/progress 쿠키로 복원)

- [ ] 강제 새로고침 후 체크 상태 유지됨

---

### 시나리오 3: localStorage.clear() → 재로드 → 서버 복원

**검증 방법:** 브라우저 수동

**절차**
1. Dashboard 상태에서 DevTools Console: `localStorage.clear()` 실행
2. 페이지 새로고침 (`Cmd+R`)
   - `profile` 키도 삭제됐으므로 Landing 또는 OnboardingForm으로 이동 (정상)
   - `sid` 쿠키는 `httpOnly` → JS에서 삭제 불가, 세션 유지됨
3. 온보딩 재진행 → Dashboard 진입
4. 이전에 체크한 항목이 복원됐는지 확인
5. (선택) DevTools Application > Cookies에서 `sid` 쿠키 존재 확인

- [ ] localStorage.clear() 후 온보딩 재진행 시 체크 상태가 서버에서 복원됨

---

### 시나리오 4: 시크릿 창 → 별도 빈 세션 격리 ✅

**검증 방법:** curl (쿠키 파일 분리로 시뮬레이션)

```bash
# 새 세션 발급 (시크릿 창 = 쿠키 없는 첫 요청)
curl -s -c /tmp/hub_cookies_new.txt http://localhost:4000/api/health
curl -s -b /tmp/hub_cookies_new.txt http://localhost:4000/api/progress
```

**실행 결과 (2026-07-16)**

| 항목 | 기대 | 실제 |
|---|---|---|
| 새 세션 GET progress | `{}` | `{}` ✅ |
| 세션 A UUID | — | `7e92a339-0c05-4b37-b8cd-6ea75c057146` |
| 세션 B UUID | — | `ffd7f651-649c-47a0-9415-1867c4b7aff9` |

- [x] 새 세션에서 GET /api/progress → 빈 객체 반환
- [x] sid 쿠키 UUID가 세션 A와 세션 B가 서로 다름 (완전 격리)

---

## 발견된 버그 및 수정 내역

없음.

---

## 재검증 명령 (빠른 회귀 테스트)

```bash
# 전체 API 경로 한 번에 확인
curl -s -c /tmp/cookies.txt http://localhost:4000/api/health && \
curl -s -b /tmp/cookies.txt -X POST http://localhost:4000/api/progress/business-closure-report/toggle && \
curl -s -b /tmp/cookies.txt http://localhost:4000/api/progress
```
