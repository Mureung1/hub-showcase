# DB 스키마 설계 — 자취방 청결관리사

> 작성일: 2026-07-20
> 상태: v1 확정 
> 저장소: 1차 서버 메모리 Map → 나중에 SQLite 승격 (스키마 그대로 유지)

---

## 0. 설계 철학

이 DB의 목적은 대화를 기록하는 게 아니라, **미래의 진단이 과거를 꺼내 쓰기 위한 재료 창고**다.

- 화면 상태(`screen: s0~s4`)는 저장하지 않는다. 그건 UI 상태지 기억이 아니다.
- DB엔 **사실("무슨 일이 있었나")만** 남기고, 화면은 그 사실로부터 다시 계산한다 (`화면 = f(상태)`).

---

## 1. 테이블 구조 — 일자 사슬

```
spaces         내 집 공간. 세션과 무관하게 영속. 침묵/프로브의 단위.
  └ sessions   진단 대화 1회. 최종 결론(진단)을 자기 컬럼에 품음.
      └ turns  주고받음 1개. 그 시점 확률분포 스냅샷(궤적)을 품음.
```

관계: `spaces (1)→(N) sessions (1)→(N) turns`. 자식이 부모 id를 참조하는 단순 구조.

### 설계 결정 기록

- **hypotheses 별도 테이블 없음 (B안):** 세션당 최종 결론은 1개이므로 `sessions` 행 안 컬럼으로 흡수. 여러 후보 카드를 늘어놓지 않고 top-1만 표시하는 UI 방향과 일치.
- **가설의 "산물성"은 궤적으로 표현:** "가설은 매 턴 갱신되는 산물"이라는 직관은 맞다. 단, 저장 단위는 턴이 아니라 세션(결론)이고, 턴마다 움직이는 확률분포 전체는 `turns.posterior_snapshot`에 스냅샷으로 남긴다.
- **confidence는 숫자로 저장, 표시할 때만 라벨 변환:** 불변식 6번("숫자 노출 금지")은 이제 **DB가 아니라 API 경계**에서 지켜진다. DB엔 `0.62`가 있지만 서버가 프론트로 내보낼 때 `most_likely`로 변환한다. 변환 지점은 응답 직렬화 **딱 한 곳**.

---

## 2. 스키마 (SQL DDL)

```sql
-- ── spaces ──────────────────────────────────
-- 내 집 공간. 세션과 무관하게 영속. 침묵/프로브의 단위.
CREATE TABLE spaces (
  id              TEXT PRIMARY KEY,      -- 'space_kitchen'
  name            TEXT NOT NULL,         -- '부엌'
  icon            TEXT,                  -- '🍳'
  last_checked_at INTEGER,               -- epoch ms. "21일째 확인 안 함" 계산의 근거 (저장은 시각만)
  created_at      INTEGER NOT NULL
);

-- ── sessions ────────────────────────────────
-- 진단 대화 1회. B안: 최종 결론을 자기 컬럼에 품음.
CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,         -- 'sess_abc'
  space_id     TEXT NOT NULL REFERENCES spaces(id),
  source       TEXT NOT NULL,            -- 'quick' | 'text' | 'photo'
  problem_text TEXT,                     -- 사용자 최초 입력 or 요약
  final_cause  TEXT,                     -- 결론 원인 enum. 진행중이면 NULL
  final_score  REAL,                     -- 숫자로 저장 (0.62). 표시는 서버가 라벨 변환
  status       TEXT NOT NULL,            -- 'active' | 'resolved' | 'gave_up'
  created_at   INTEGER NOT NULL,
  ended_at     INTEGER                   -- 종료 전엔 NULL
);

-- ── turns ───────────────────────────────────
-- 주고받음 1개. 그 시점 확률분포 스냅샷(궤적)을 품음.
CREATE TABLE turns (
  id                 TEXT PRIMARY KEY,
  session_id         TEXT NOT NULL REFERENCES sessions(id),
  turn_index         INTEGER NOT NULL,   -- 0,1,2,3... 순서
  question           TEXT,               -- 그 턴에 물은 것
  user_answer        TEXT,               -- 사용자 답 (예/아니오/자유텍스트)
  posterior_snapshot TEXT NOT NULL,      -- 그 턴 끝 확률분포 전체 (JSON 문자열)
  created_at         INTEGER NOT NULL
);
```

---

## 3. confidence 표시 변환 — 불변식 6번의 유일한 방어선

```js
// 서버 응답 직렬화 시에만 호출. DB→프론트 경계.
// 프론트는 final_score(숫자)를 절대 못 본다. label만 받는다.
function scoreToLabel(score) {
  if (score >= 0.60) return 'most_likely';
  if (score >= 0.30) return 'possible';
  return 'unlikely';
}
```

임계값(0.60 / 0.30)은 정책 임계값(`PROPOSE=0.60`)과 연동. 라벨 경계는 이후 조정 가능.

---

## 4. posterior_snapshot JSON 형태 (turns 컬럼)

```json
{
  "drain_organic":    0.62,
  "strainer_residue": 0.18,
  "trap_dry":         0.11,
  "food_left":        0.05
}
```

- 매 턴 끝에 **모든 원인에 대한 확률분포 전체**를 저장.
- 용도: 디버깅("3턴째에 왜 trap_dry가 튀었지?") + 재현. CLAUDE.md의 "디버깅 가능성이 핵심 자산"을 DB 레벨에서 보장.
- 데모 스케일(세션 몇 개)에선 부담 없음. 나중에 추가하면 과거 세션엔 궤적이 없어 반쪽이 되므로 **지금부터** 저장.

---

## 5. 화면 ↔ 테이블 매핑 (mock 역산)

| mock 화면/요소 | 읽는 테이블 | 비고 |
|---|---|---|
| Rail(왼쪽 공간 목록), "21일째 확인 안 함" | `spaces.last_checked_at` | 문자열 저장 X, 현재 시각과 빼서 계산 |
| S4 완료 요약 (문제/진단/마무리) | `sessions` | `final_cause`, `status` |
| "왜 이 진단?" 디버깅 | `turns.posterior_snapshot` | 궤적 추적 |
| 진입 방식 (kitchen/text/photo) | `sessions.source` | mock의 `sessionSource` |

---

## 6. 슬라이스에서 실제로 도는 왕복 (이번 주 목표)

```
[탭 클릭]
  → POST /api/sessions        (서버)
  → 엔진 require 호출          (packages/kb/engine, 순수 함수)
  → sessions/turns 행 생성     (DB 쓰기)
  → 응답 (score→label 변환)    (API 경계)
  → 카드 1장 렌더              (화면)
[세션 종료 클릭]
  → sessions.status = resolved, ended_at 기록  (DB 쓰기)
  → spaces.last_checked_at 갱신                (DB 쓰기)
  → Rail 다시 읽기 → "방금 확인함"으로 반영     (DB 읽기 = 왕복 완성)
```
