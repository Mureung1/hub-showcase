# HANDOFF — Claude Code 인계 문서

> 이 파일을 Claude Code에게 통째로 읽히세요. 그대로 따라 하면 됩니다.

---

## 0. 이게 뭔가 (3줄)

자취방 청결 진단 AI의 **진단 엔진 + KB 수집 파이프라인**입니다.
핵심 철학: **LLM에게 확률·판단을 시키지 않는다.** LLM은 "자유텍스트→구조화"와
"결정→문장"만 하고, 진단 논리(베이즈/정보이득/종료판단)는 전부 순수 함수로 코드에 있습니다.

---

## 1. ⚠️ 먼저 알아야 할 것 — 아직 검증 안 된 부분

| 구성요소 | 상태 |
|---|---|
| `engine/*` (수학·정책·감사) | ✅ **검증됨.** 유닛테스트 12/12, 손계산 대조 완료 |
| `agents/aggregate.js` (집계) | ✅ **검증됨.** 모사 카드 27장으로 동작 확인 |
| `agents/collect.js` (웹 크롤) | 🔴 **한 번도 실행 안 됨.** 이전 환경에서 npm 설치가 막혀 있었음 |
| `kb/cards/kitchen_odor.json` | ⚠️ **모사 데이터.** 실제 크롤 결과가 아님 (형식 참고용) |

**→ 첫 작업은 `collect`를 실제로 돌려서 고치는 것입니다.** 아래 Task 1 참조.

---

## 2. Task 1 — 환경 세팅 & 엔진 검증 (LLM 불필요, 5분)

```bash
cd packages/kb          # 또는 이 폴더를 둔 위치
npm i @anthropic-ai/sdk

node engine/test.js     # 반드시 12/12 통과해야 함. 실패하면 여기서 멈추고 보고할 것.
node run.js audit kitchen_odor
```

기대 출력:
```
🎉 12 passed, 0 failed
...
| τ=0.35 (또렷) | 98.0% | 2.66 | KB 실력의 상한 |
- 취약 쌍(D_JS<0.35): 0개 / 전체 15쌍
```

이게 안 나오면 **파일이 깨진 것**입니다. 진행하지 말고 보고하세요.

---

## 3. Task 2 — 🔴 실제 크롤 (핵심 작업)

```bash
export ANTHROPIC_API_KEY=sk-...
node run.js collect kitchen_odor
```

### 예상되는 실패와 대응

| 증상 | 원인 | 고칠 곳 |
|---|---|---|
| 카드 0~5장 | 검색이 광고글만 물어옴 | `agents/spec.js`의 `queries` 배열 — 검색어를 더 구체적으로 |
| `safeJSON` fallback 자주 탐 | 모델이 마크다운 코드펜스나 설명을 붙임 | `agents/collect.js`의 프롬프트 — "JSON만" 지시 강화 |
| `cause` id가 매번 다름 (`drain_smell` vs `drain_organic`) | 🔴 **가장 치명적.** 같은 원인이 다른 id로 흩어지면 집계가 무너짐 | `extract()` 프롬프트에 **허용 id 목록을 고정으로 박아넣을 것** |
| `axes`가 전부 `unspecified` | 문서가 그 축을 안 다룸 | 정상. 무응답은 집계에서 제외됨 |

**`cause` id 통일이 제일 중요합니다.** 지금 프롬프트는 예시만 주고 있는데,
실제로 돌려보고 id가 흩어지면 **enum으로 강제**하세요:

```js
// agents/collect.js 의 extract() 프롬프트에 추가
- "cause"는 반드시 아래 중 하나. 없으면 그 원인은 무시하고 넘어가라:
  drain_organic, trap_dry, food_waste, mold_under_sink, fridge_spoiled, sponge_dishcloth
```
(첫 크롤에서 나온 id 분포를 보고, 새로 발견된 유의미한 원인은 목록에 추가)

### 크롤 후

```bash
node run.js build kitchen_odor    # 카드 → KB (LLM 불필요)
node run.js audit kitchen_odor    # ★ 반드시 실행
```

`audit` 리포트의 **§5 쌍별 판별력**을 보세요.
- 취약 쌍 0개 → 통과
- 취약 쌍 있음 → **Task 3으로**

---

## 4. Task 3 — 취약 쌍이 나오면

**임계값을 만지지 마세요.** 실증적으로 틀린 처방입니다 (아래 §6 참조).

1. `engine/propose_axis.js`의 `CANDIDATES` 배열에 후보 축을 추가
   - 취약 쌍 두 원인의 **물리적 차이**를 생각해서 질문을 만든다
   - 예: 배수구(물 흐르는 구멍) vs 수세미(젖어 마르는 물건) → "수세미에 코 대보면 냄새 나나요?"
   - `L` 값은 5단계만: `0.90 / 0.70 / (0.50=생략) / 0.25 / 0.05`
   - `cost`: 탭 1.0, 사진 3.0, 물리행동 4.0
2. `node engine/propose_axis.js` 실행
3. 표에서 **정확도↑ + 최악원인↑ + 취약쌍↓** 인 축만 채택
4. ⚠️ **IG가 높다고 좋은 축이 아니다** — §6 참조
5. 채택한 축을 `kb/draft/<domain>.json`의 `observables`에 추가
6. `node run.js audit` 재실행 → 취약 쌍 0개 확인

---

## 5. Task 4 — bathroom_mold

`agents/spec.js`에 이미 정의돼 있습니다.
```bash
node run.js all bathroom_mold
```
kitchen과 동일한 절차. 취약 쌍 나오면 Task 3.

---

## 6. 🔴 절대 어기지 말 것 (실증으로 확립된 규칙)

### ① LLM에게 확률을 만들게 하지 않는다
- LLM 역할은 딱 둘: **인식자**(자유텍스트→KB 어휘), **설명자**(결정→문장)
- 확률 갱신·질문 선택·종료 판단은 `engine/`의 순수 함수. LLM 관여 금지.
- 이유: 진단이 이상할 때 **프롬프트를 주술처럼 만지는 대신 KB 숫자를 고칠 수 있다.**

### ② KB를 고쳤으면 반드시 `audit`을 돌린다
- 취약 쌍(D_JS < 0.35)이 생겼는지 확인. 생겼으면 축을 추가.

### ③ 임계값(`engine/policy.js`의 `T`)을 손으로 고치지 않는다
- `node engine/tune.js`로 스윕하고, 근거를 주석에 남긴다.
- **실증**: `MIN_GAIN=0.15`는 v1(4축)에서 희귀 원인 정확도를 **0%**로 만들었다.
  스윕으로 0.08을 찾아 45%로 복구. 그런데 v2(7축)에선 0.15여도 95%.
  → **임계값 튜닝은 KB 결함의 증상 치료다. 근본은 KB(축)를 고치는 것.**

### ④ IG가 높은 질문 ≠ 좋은 질문
- **실증**: `water_run_test`는 IG 1등(0.433)인데 단독 추가 시 정확도를 **떨어뜨렸다** (86%→75%).
  평균적으로 유용하지만 특정 쌍을 확실히 가르지 못해, 첫 턴을 낭비하고 취약 쌍을 놓친다.
- → IG(전역 불확실성 감소)와 D_JS(쌍별 판별력)는 **다른 목적함수**. 둘 다 봐야 한다.

### ⑤ prior에 근거 없는 숫자 금지
- 모든 prior에 `prior_source`(어떻게 셌는지)와 `evidence`(URL 배열) 필수.
- 집계자가 자동으로 채운다. 손으로 고쳤으면 근거도 손으로 갱신.

### ⑥ confidence는 질적 라벨만
- 사용자에게 숫자(0.72) 노출 금지. `core.js`의 `label()` 사용: 유력/가능/낮음/희박.

---

## 7. 수학 참조

| 무엇 | 식 | 어디 |
|---|---|---|
| 베이즈 갱신 | P(H\|E) = P(E\|H)P(H) / ΣP(E\|Hj)P(Hj) | `core.js: bayes` (로그공간) |
| 엔트로피 | H(P) = -Σ p log₂ p | `core.js: entropy` |
| 정보이득 | IG(Q) = H(P) - Σ_a P(a)·H(P\|a) | `core.js: infoGain` |
| 답변 확률 | P(a) = Σ P(a\|Hi)P(Hi) | `core.js: pAnswer` (=베이즈 분모) |
| 비용 보정 | score = IG / cost^λ | `core.js: score` |
| **쌍별 판별력** | D_JS(Pi‖Pj) = ½KL(Pi‖M) + ½KL(Pj‖M), M=(Pi+Pj)/2 | `confusion.js: jsDivergence` |
| 사전확률 | P(H) = (nᵢ+α)/(N+αK), α=1 | `aggregate.js` (Laplace) |
| 우도 | lift = P(a\|H)/P(a) → 5단계 스냅 | `aggregate.js: liftToL` |

---

## 8. 현재 성능 (모사 데이터 기준 — 실제 크롤 후 재측정 필요)

| ver | 축 | 정확도(τ=0.35) | 최악 원인 | 취약 쌍 |
|---|---|---|---|---|
| 0.1.0 | 4 | 80.8% | **0%** 🔴 | 3개 |
| 0.2.0 | 7 | **98.0%** | **100%** ✅ | **0개** |

프로젝트 성공기준: **Golden set 10개 중 7개 (70%)**. τ=1.0(현실 사용자)에서 69.5%.

---

## 9. 아직 안 만든 것 (다음 단계)

- 🔲 **LLM 인식자** — 자유텍스트/사진 → `{smell_type: "rotten_egg", ...}` 매핑
- 🔲 **LLM 설명자** — `{move:"PROPOSE", top:"trap_dry"}` → 사람 말
- 🔲 **세션 상태 관리** — 턴 진행, reject/unknown 처리
- 🔲 **Express API** — `POST /api/sessions`, `/turns`, `/end`
- 🔲 **골든셋 10개** — ⚠️ KB를 골든셋에 맞춰 튜닝하면 과적합. 순서 문제 미해결.

`engine/`과 `agents/`는 이미 완성이고 테스트도 있으니, 위 목록만 채우면 됩니다.
