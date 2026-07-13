# KB 수집·검증 파이프라인

## 철학
> **LLM에게 확률을 만들게 하지 않는다.** LLM은 "번역"만 하고, 숫자는 카드를 **세어서** 나온다.
> 그리고 그 숫자를 **수학(감사관)이 먼저 깐다.**

```
[스카우트] 웹 크롤     → kb/raw/*.json     (LLM)
[추출자]   글 → 카드   → kb/cards/*.json   (LLM, 구조화만)
[집계자]   카드 → 확률 → kb/draft/*.json   (코드, Laplace+lift)
[감사관]★  KB → 리포트 → reports/*.md      (코드, IG/시뮬/강건성)
```

## 사용법
```bash
export ANTHROPIC_API_KEY=sk-...

node run.js collect kitchen_odor   # 웹 크롤 → 카드      (LLM 필요)
node run.js build   kitchen_odor   # 카드 → KB 초안       (LLM 불필요, 즉시)
node run.js audit   kitchen_odor   # KB 감사 리포트 ★     (LLM 불필요, 즉시)
node run.js all     kitchen_odor   # 전부

node engine/test.js                # 엔진 유닛테스트 (손계산 대조 12개)
node engine/tune.js                # 임계값 그리드 스윕 144조합
node engine/propose_axis.js        # ★ 축 후보 평가 (추가하기 '전에' 효과 예측)
node run.js audit kitchen_odor --kb kb/kitchen.json   # 손으로 고친 KB 검사
```

## 새 도메인 추가
`agents/spec.js`의 `DOMAINS`에 항목 하나 추가. 끝.
(bathroom_mold 이미 준비됨: `node run.js all bathroom_mold`)

## 수학
| 무엇 | 식 | 어디 |
|---|---|---|
| 베이즈 갱신 | P(H\|E) = P(E\|H)P(H) / ΣP(E\|Hj)P(Hj) | core.js `bayes` (로그공간) |
| 엔트로피 | H(P) = -Σ p log₂ p | core.js `entropy` |
| 정보이득 | IG(Q) = H(P) - Σ_a P(a)·H(P\|a) | core.js `infoGain` |
| 답변 확률 | P(a) = Σ P(a\|Hi)P(Hi) | core.js `pAnswer` (=베이즈 분모) |
| 비용 보정 | score = IG / cost^λ | core.js `score` |
| **쌍별 판별력** | D_JS(Pi‖Pj) = ½KL(Pi‖M)+½KL(Pj‖M), M=(Pi+Pj)/2 | confusion.js `jsDivergence` |
| 사전확률 | P(H) = (nᵢ+α)/(N+αK), α=1 | aggregate.js (Laplace) |
| 우도 | lift = P(a\|H)/P(a) → 5단계 스냅 | aggregate.js `liftToL` |

## 검증된 사실
- ✅ `IG(환기하세요?) = 0.000` vs `IG(냄새종류) = 0.561` — 뻔한 질문이 **수학적으로** 자동 폐기됨
- ✅ 손계산과 코드 일치 (소수 3자리, 유닛테스트 12/12)
- ✅ 파라미터 ±20% 섭동해도 정확도 78.5% ± 4.6%p — **지어낸 숫자에 결과가 안 흔들림**
- 🔴 MIN_GAIN=0.15는 **틀렸다** — 희귀원인(냉장고) 정확도를 0%로 만듦. 스윕으로 0.08 발견.

## 감사관이 잡아내는 것
- 사문화된 질문 (IG < MIN_GAIN) — 있으나 마나 한 질문
- 원인별 정확도 — 어떤 원인이 못 잡히는지
- 사용자 온도 3단 (τ=0.35/1.0/2.0) — KB 실력 vs 사용자 노이즈 분리
- 강건성 — 파라미터를 흔들어도 결과가 유지되는지


## ★ 핵심 발견 — IG만으로는 부족하다

`water_run_test`는 **IG 1등(0.433)인데 정확도를 떨어뜨렸다** (86% → 75%).
평균적으로 유용하지만 **특정 쌍을 확실히 가르지는 못하는** 질문이기 때문.
정책 엔진이 이걸 1순위로 뽑아 첫 턴을 낭비 → 정작 취약한 쌍을 못 가름.

> **IG(전역 불확실성 감소) ≠ 판별력(특정 쌍 구분).** 목적함수가 다르다.
> IG만 최적화하면 "두루뭉술하게 유용한" 질문을 뽑는다.

→ 그래서 **Jensen-Shannon divergence로 쌍별 판별력을 따로 잰다.**
D_JS < 0.35인 쌍은 **어떤 알고리즘으로도 못 가른다. 정보가 애초에 없기 때문.**
튜닝이 아니라 **축을 추가해야** 한다.

## KB 개선 이력 (kitchen_odor)

| ver | 축 | 정확도(τ=0.35) | 최악 원인 | 취약 쌍 | 무엇을 했나 |
|---|---|---|---|---|---|
| 0.1.0 | 4 | 80.8% | **0%** 🔴 | 3개 | 집계자 자동 생성 |
| 0.2.0 | 7 | **98.0%** | **100%** ✅ | **0개** | JS로 취약쌍 탐지 → 판별축 3개 추가 |

추가된 축 (`propose_axis.js`가 4개 후보 중 선별):
- `sponge_smell` — "수세미에 코 대보면 냄새 나나요?" → 배수구↔수세미 판별
- `fridge_open_test` — "냉장고 열면 심해지나요?" → 음식물↔냉장고 판별
- `water_run_test` — "물 세게 틀면 심해지나요?" → 배수구↔트랩 판별

## 임계값의 교훈
```
v1 (4축):  MIN_GAIN=0.15 → 최악원인 0%   🔴 치명적
v1 (4축):  MIN_GAIN=0.08 → 최악원인 45%
v2 (7축):  MIN_GAIN=0.15 → 최악원인 95%  (무감해짐!)
```
> **임계값 튜닝은 KB 결함의 증상 치료다. 근본은 KB를 고치는 것.**
