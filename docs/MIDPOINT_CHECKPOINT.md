# 중간점검 & 다음 단계 로드맵

**작성일**: 2026-07-23

---

## 1. 현재 상태 진단

### 엔진 호환성

| 항목 | 상태 | 비고 |
|------|------|------|
| export 형식 | **ESM** (`export function ...`) | Node.js와 호환 |
| 서버 import | ✅ 정상 | `routes/sessions.js`에서 `bayes`, `decide`, `initState` import 중 |
| 모듈 해석 | ✅ 정상 | 상대 경로 `../../../packages/kb/engine/core.js` 사용 |

**결론**: 엔진 ↔ 서버 호환성 문제 없음

---

### React-API 현재 연결

| React 함수 | mock/api.js | 실제 서버 엔드포인트 | 연결 상태 |
|------------|-------------|---------------------|----------|
| `startSession()` | 하드코딩된 질문 반환 | `POST /api/sessions` | ❌ 미연결 |
| `turn(sessionId, action)` | 턴수로 분기 | `POST /api/sessions/:id/turns` | ❌ 미연결 |
| `done(sessionId)` | 세션 삭제 | `POST /api/sessions/:id/done` | ❌ 미연결 |

**핵심 차이점**:

```
mock/api.js (가짜)                      실제 서버 (진짜)
─────────────────────────────────────────────────────────
turn(sessionId, action)                 turn(sessionId, { axisId, answer })
→ action은 option.id만                  → axisId(축 ID) + answer(선택지 ID)

needMoreInfo: { question, options }     needMoreInfo: { axisId, question, options }
→ axisId 없음                           → axisId 있음 (BE가 축 식별 필요)

hypotheses.confidence = 'most_likely'   hypotheses.confidence = 'most_likely'
→ 동일 (영문 라벨)                      → 동일 (불변식 6번 준수)
```

---

### 서버 라우트 현황

| 엔드포인트 | 상태 | 구현 위치 |
|-----------|------|----------|
| `GET /api/spaces` | ✅ 구현됨 | `server.js:58-68` |
| `POST /api/spaces` | ✅ 구현됨 | `server.js:20-38` |
| `GET /api/spaces/:id` | ✅ 구현됨 | `server.js:41-55` |
| `POST /api/sessions` | ✅ 구현됨 | `routes/sessions.js:28-83` |
| `POST /api/sessions/:id/turns` | ✅ 구현됨 | `routes/sessions.js:88-190` |
| `POST /api/sessions/:id/done` | ✅ 구현됨 | `routes/sessions.js:195-246` |

**놀라운 발견**: 서버 엔드포인트는 **이미 전부 구현되어 있음!**
문제는 React가 아직 mock을 사용하고 있다는 것.

---

### 데이터 흐름 현재 상태

```
[현재 — 가짜]
React state → mock/api.js → (하드코딩 데이터) → 화면

[목표 — 진짜]
React state → fetch('/api/sessions') → Express → Supabase + Engine → 화면
```

---

## 2. 비어있는 부분 체크리스트

### FE 레이어

| 항목 | 상태 | 비고 |
|------|------|------|
| mock/api.js → 실제 서버 호출 | ❌ | **핵심 작업** |
| React가 sessionId 보관 | ✅ | `useState(sessionId)` |
| 공간 목록 서버 연결 | ❌ | DOMAINS 하드코딩 (L45-49) |
| CSS 토큰 변수 사용 | ✅ | `var(--color-...)` 패턴 준수 |
| confidence 라벨만 표시 | ✅ | `CONFIDENCE_LABELS` 매핑 사용 |
| CORS 설정 | ❌ | Express에 cors 미들웨어 없음 |
| axisId 전송 | ❌ | mock은 option.id만, 서버는 axisId+answer 필요 |

### BE 레이어

| 항목 | 상태 | 비고 |
|------|------|------|
| POST /api/sessions 구현 | ✅ | `routes/sessions.js` |
| POST /api/sessions/:id/turns 구현 | ✅ | `routes/sessions.js` |
| POST /api/sessions/:id/done 구현 | ✅ | `routes/sessions.js` |
| CORS 미들웨어 | ❌ | **없음 — FE 연결 시 차단됨** |

### 엔진 연결

| 항목 | 상태 | 비고 |
|------|------|------|
| 엔진 서버 import | ✅ | `bayes`, `decide`, `initState` |
| AI 호출 (Claude API) | ❌ | **미구현** — 현재는 KB 규칙만 사용 |
| KB 선택 로직 | ✅ | `loadKB(domain)` 구현됨 |
| scoreToLabel() | ✅ | `lib/label.js:23-27` |
| toResponse() | ✅ | `lib/label.js:51-99` |

### 데이터베이스

| 항목 | 상태 | 비고 |
|------|------|------|
| spaces 테이블 | ✅ | Supabase에 존재 |
| sessions 테이블 | ✅ | id, space_id, status, final_cause, ended_at |
| turns 테이블 | ✅ | id, session_id, turn_index, question, user_answer, posterior_snapshot |
| 외래키 제약 | ? | 확인 필요 |

### UI/UX

| 항목 | 상태 | 비고 |
|------|------|------|
| 2단 레이아웃 (Rail + Stage) | ✅ | `App.jsx` grid 구조 |
| 가정 박스 (점선, amber) | ❌ | ASSUME_AND_PROPOSE 시각화 없음 |
| HypothesisCard | ✅ | 구현됨 (L130-185) |
| DisputeBox (반박) | ❌ | 재검증 UI 없음 |
| VERIFY 응답 처리 | ❌ | needMoreInfo로 오지만 특별 처리 없음 |

---

## 3. 우선순위 로드맵

### [P0] FE-BE 연결 (필수)

```
├─ [1] Express CORS 설정 추가
│    이유: 없으면 브라우저가 API 호출 차단
│
├─ [2] mock/api.js → 실제 fetch 호출로 교체
│    - startSession() → POST /api/sessions
│    - turn() → POST /api/sessions/:id/turns
│    - done() → POST /api/sessions/:id/done
│
└─ [3] axisId 전달 로직 추가
     - 현재: option.id만 전달
     - 필요: { axisId: response.needMoreInfo.axisId, answer: option.id }
```

### [P0] 공간 목록 연결

```
├─ [4] Rail에서 /api/spaces 호출
│    - DOMAINS 하드코딩 → useEffect + fetch
│
└─ [5] 공간 선택 시 spaceId 전달
     - handleStart에서 선택된 공간 ID를 서버에 전송
```

### [P1] 가정/검증 UI

```
├─ [6] ASSUME_AND_PROPOSE 화면 구현
│    - 점선 박스 + amber 색상
│    - "확정 못했지만 가장 유력" 메시지
│
└─ [7] VERIFY 응답 특별 처리
     - 예/아니오 버튼
     - 검증 결과 반영
```

### [P2] AI 연결 (선택)

```
├─ [8] Claude API 호출 라우트
│    - 자유 텍스트 → KB 어휘 변환 (인식자)
│    - 결정 → 사람 말 변환 (설명자)
│
└─ [9] 사진 입력 처리
     - Vision API 연동
```

---

## 4. 구현 순서

### 1순위: CORS + fetch 연결

**왜?** 이게 없으면 아무것도 동작 안 함. 서버는 이미 완성, FE만 연결하면 됨.

```javascript
// apps/api/server.js에 추가
import cors from 'cors'
app.use(cors({ origin: 'http://localhost:5173' }))
```

### 2순위: mock/api.js 교체

**왜?** 서버가 이미 완성되어 있으므로, FE에서 호출만 바꾸면 진짜 진단이 동작함.

```javascript
// apps/web/src/mock/api.js → apps/web/src/api.js
const API_BASE = 'http://localhost:3000/api'

export async function startSession(spaceId) {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ spaceId })
  })
  return res.json()
}

export async function turn(sessionId, axisId, answer) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/turns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ axisId, answer })
  })
  return res.json()
}
```

### 3순위: App.jsx 호출부 수정

**왜?** API 시그니처가 바뀌었으므로 호출부도 맞춰야 함.

```javascript
// handleOptionClick 수정
const handleOptionClick = async (option) => {
  const axisId = response.needMoreInfo.axisId  // ← 추가
  const result = await turn(sessionId, axisId, option.id)  // ← 변경
  // ...
}
```

### 4순위: 공간 목록 서버 연결

**왜?** 현재 DOMAINS 하드코딩 → 서버의 /api/spaces 사용

### 5순위: ASSUME/VERIFY UI

**왜?** 핵심 흐름 완성 후 UX 개선

---

## 5. 발견된 좋은 점

1. **서버가 이미 완성됨** — `routes/sessions.js` 249줄, 전체 진단 흐름 구현
2. **불변식 6번 준수** — `lib/label.js`에서 모든 숫자→라벨 변환
3. **CSS 토큰 시스템** — `tokens.css` 77줄, raw hex 없음
4. **엔진 분리** — `packages/kb/engine/` 순수 함수, 테스트 27개 통과
5. **Supabase 연동** — spaces, sessions, turns 테이블 작동 확인됨

---

## 6. 즉시 실행 가능한 작업

```bash
# 1. CORS 설치
cd apps/api && npm install cors

# 2. 서버 테스트 (현재 상태 확인)
node --env-file=.env server.js

# 3. curl로 세션 생성 테스트
curl -X POST http://localhost:3000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"spaceId": "kitchen"}'
```

**핵심 메시지**: 서버는 완성됐다. FE에서 mock을 fetch로 바꾸면 끝.
