# 개발 보고서 — 2026-07-23

## 브리핑 요약

**한 줄 요약**: mock API를 걷어내고 진짜 서버와 연결하여 **M2 심장박동**을 달성했습니다.

```
Before: React → mock/api.js → (하드코딩 데이터)
After:  React → api.js → Express → Supabase + KB Engine
```

---

## 1. 오늘 구현한 것

### Step 1: CORS 미들웨어 (2줄)

**파일**: `apps/api/server.js`

```javascript
import cors from 'cors'
app.use(cors({ origin: 'http://localhost:5173' }))
```

**왜 필요한가**: 브라우저의 Same-Origin Policy 때문에 localhost:5173(FE)에서 localhost:3000(BE)으로 요청하면 차단됨. CORS 헤더를 추가해서 허용.

---

### Step 2: 실제 API 모듈 작성 (75줄)

**파일**: `apps/web/src/api.js`

| 함수 | 엔드포인트 | 역할 |
|------|-----------|------|
| `fetchSpaces()` | GET /api/spaces | 공간 목록 조회 |
| `startSession(spaceId)` | POST /api/sessions | 세션 시작, 첫 질문 받기 |
| `turn(sessionId, axisId, answer)` | POST /api/sessions/:id/turns | 답변 제출, 다음 단계 |
| `done(sessionId)` | POST /api/sessions/:id/done | 세션 종료 |

**핵심 변경**: mock은 `turn(sessionId, action)`이었는데, 실제 서버는 `turn(sessionId, axisId, answer)`로 축 ID를 별도로 받음.

---

### Step 3: App.jsx 호출부 수정 (3곳)

1. **import 변경**: `mock/api.js` → `api.js`
2. **handleOptionClick**: `axisId` 추출 후 전달
3. **handleStart**: `selectedSpace` 전달

```javascript
// Before
const result = await turn(sessionId, option.id)

// After
const axisId = response.needMoreInfo.axisId
const result = await turn(sessionId, axisId, option.id)
```

---

### Step 4: 공간 목록 서버 연결 (30줄)

**변경 사항**:
- `DOMAINS` 하드코딩 → `spaces` state + `useEffect`
- `selectedSpace` state 추가
- Rail 클릭 시 `setSelectedSpace()` 호출
- `handleStart`에서 `selectedSpace` 사용

```javascript
useEffect(() => {
  fetchSpaces()
    .then((data) => {
      setSpaces(data)
      setSelectedSpace(data[0].id)
    })
}, [])
```

---

### Step 5: ASSUME_AND_PROPOSE UI (25줄)

**서버 수정** (`lib/label.js`):
```javascript
if (decision.move === 'ASSUME_AND_PROPOSE') {
  return {
    ...base,
    hypotheses: toHypothesesResponse(state.posterior, kb),
    assumed: true,
    assumeReason: decision.why,
  };
}
```

**FE 수정** (`App.jsx`):
- 점선 박스 + amber 배경
- "가정 기반 진단" 경고 메시지
- 헤더 이모지 변경: 🔍 → 🤔

---

## 2. 구현 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│                          BEFORE (mock)                               │
├─────────────────────────────────────────────────────────────────────┤
│  [진단 시작] → startSession() → 하드코딩 질문 반환                    │
│  [답변 선택] → turn(id, action) → 턴수로 분기 → 3턴째 하드코딩 가설    │
│  [마치기]   → done(id) → 세션 삭제                                   │
└─────────────────────────────────────────────────────────────────────┘
                               ↓ 교체
┌─────────────────────────────────────────────────────────────────────┐
│                          AFTER (real)                                │
├─────────────────────────────────────────────────────────────────────┤
│  [진단 시작] → POST /api/sessions                                    │
│               → loadKB('kitchen_odor')                               │
│               → initState(kb) → prior 초기화                         │
│               → decide(kb, state) → 첫 질문 선택 (IG 최대)           │
│               → toResponse() → { needMoreInfo: { axisId, question }} │
│                                                                      │
│  [답변 선택] → POST /api/sessions/:id/turns                          │
│               → bayes(posterior, likelihood) → 사후확률 갱신         │
│               → decide(kb, state) → 다음 행동 결정                   │
│               → ASK: 질문 계속                                       │
│               → PROPOSE: 확정 진단 (p≥0.60, gap≥0.10)                │
│               → ASSUME_AND_PROPOSE: 가정 진단 (턴≥4 또는 더 물을게X)  │
│               → toResponse() → { hypotheses, assumed?, assumeReason }│
│                                                                      │
│  [마치기]   → POST /api/sessions/:id/done                            │
│               → sessions.status = 'closed'                           │
│               → { done: true }                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 검증 결과

### API 테스트 (curl)

```bash
# 세션 생성
$ curl -X POST /api/sessions -d '{"spaceId":"kitchen"}'
→ { sessionId, needMoreInfo: { axisId: "water_run_test", question: "물을..." }}

# 턴 진행 (4회)
$ curl -X POST /api/sessions/:id/turns -d '{"axisId":"...", "answer":"..."}'
→ 턴 1-3: { needMoreInfo: { 다음 질문 } }
→ 턴 4:   { hypotheses: [...], assumed: true, assumeReason: "확정 못했지만..." }

# 세션 종료
$ curl -X POST /api/sessions/:id/done
→ { done: true }
```

### 불변식 준수 확인

| 불변식 | 상태 | 증거 |
|--------|------|------|
| #1: LLM에게 확률 계산 금지 | ✅ | `bayes()`, `decide()`는 엔진 순수함수 |
| #6: confidence 숫자 노출 금지 | ✅ | `"confidence": "possible"` (문자열) |
| CLAUDE.md: raw hex 금지 | ✅ | `var(--color-accent-warning)` 사용 |

---

## 4. 파일 변경 목록

| 파일 | 변경 유형 | 줄 수 |
|------|----------|-------|
| `apps/api/server.js` | 수정 | +2 |
| `apps/api/lib/label.js` | 수정 | +8 |
| `apps/web/src/api.js` | **신규** | 75 |
| `apps/web/src/App.jsx` | 수정 | +50 |

**총 변경**: 약 135줄 (신규 75 + 수정 60)

---

## 5. 현재 아키텍처

```
apps/web/                           apps/api/
├── src/                            ├── server.js (CORS 추가)
│   ├── api.js ← NEW                ├── routes/sessions.js
│   ├── App.jsx (수정됨)            ├── lib/
│   └── mock/api.js (유지, 미사용)  │   ├── kb.js (KB 로더)
│                                   │   └── label.js (숫자→라벨)
                                    │
                                    packages/kb/
                                    ├── engine/
                                    │   ├── core.js (bayes, entropy)
                                    │   └── policy.js (decide, T)
                                    └── kb/draft/
                                        └── kitchen_odor.json
```

---

## 6. 남은 작업 (P2)

| 항목 | 우선순위 | 비고 |
|------|----------|------|
| VERIFY 응답 처리 | P2 | 예/아니오 버튼 UI |
| 공간 추가/삭제 UI | P2 | Rail에서 +/- 버튼 |
| Claude API 연동 | P2 | 인식자/설명자 |
| 에러 처리 강화 | P2 | try-catch, 토스트 메시지 |

---

## 7. 브리핑 포인트

### 질문 대비

**Q: mock과 실제 API의 차이가 뭔가요?**
- mock: 턴 수로 분기 (턴 2면 가설 제시)
- real: 베이즈 확률로 분기 (p≥0.60이면 PROPOSE)

**Q: ASSUME_AND_PROPOSE는 언제 발동하나요?**
- 턴 ≥ MAX_TURNS(4) 또는
- 더 물어도 IG < MIN_GAIN(0.08)일 때

**Q: 왜 axisId가 필요한가요?**
- 같은 "네" 답변이라도 어떤 질문에 대한 답인지 알아야 해당 likelihood를 적용할 수 있음

### 데모 시나리오

1. http://localhost:5173 접속
2. Rail에서 "주방" 선택 (서버에서 로드됨)
3. "진단 시작하기" 클릭
4. 4개 질문 모두 "확인 안 해봤어요" 선택
5. → **"가정 기반 진단"** 경고 박스 + 추정 원인 카드

---

## 8. 커밋 준비

```bash
# 변경 파일 확인
git status

# 커밋 대상
apps/api/server.js          # CORS 추가
apps/api/lib/label.js       # ASSUME 응답 분리
apps/web/src/api.js         # 신규 - 실제 API
apps/web/src/App.jsx        # useEffect, 공간연결, ASSUME UI
docs/MIDPOINT_CHECKPOINT.md # 중간점검 문서
docs/DEV_REPORT_20260723.md # 이 보고서
```

**커밋 메시지 제안**:
```
feat: FE-BE 연결 및 ASSUME UI 구현

- CORS 미들웨어 추가
- mock/api.js → api.js (실제 fetch)
- 공간 목록 서버 연결 (useEffect)
- ASSUME_AND_PROPOSE 경고 박스 UI
```
