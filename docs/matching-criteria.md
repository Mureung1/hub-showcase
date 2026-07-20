# matching-criteria.md — MBTI × 인지과학 공부법 매칭 기준 (에이전트 a)

이 문서는 **매칭 에이전트(a)** 가 사용하는 기준이다. 각 MBTI 성향(기질·4축)을 인지과학 학습법 7종에 연결한다. 출처 식별자는 `docs/reference.md`([E*], [F*], [A*], [D*])를 따른다.

> **읽는 법(가벼운 정직 라벨):** 아래 매칭은 문헌에서 도출한 **"선호일 수 있는" 출발점**이다. 실제 효과는 사용자가 실행한 뒤의 결과로 확인한다(**돕기 → 측정 → 축적** 루프). 그래서 각 성향에 "강점 활용 + **약점 보완**"을 함께 둔다 — [E1]에서 성적 상위권은 유형 선호에 머물지 않고 자기조절로 약점을 보완했기 때문이다.

> **이번 주 보강 방향 (2026-07-20):** 피드백상 "왜 이 유형에 이 공부법이 맞나"의 연결고리가 결과 화면에서 약하게 느껴진다. 아래 기질↔학습법 매칭에 **한 줄 근거(예: ENTJ=계획·구조 → `spacing`·`environment`)를 유형/기질별로 명확화**하고, `mbtiMethodMatching.js`의 `reason`·`sources`와 UI(신뢰 패널)에서 이 연결고리를 함께 노출한다. MBTI 자체의 타당성을 옹호하는 게 아니라 "이 성향엔 이 방법이 왜 시작점이 되는지"를 근거와 함께 설명하는 게 목표다(P-B·H-SRL-1 유지). 세부는 관련 GitHub 이슈로 관리한다.

## 학습법 7종 (코드 id)

`retrieval`(인출연습) · `spacing`(분산) · `selfExplanation`(자기설명) · `interleaving`(교차) · `errorAnalysis`(오답분석) · `environment`(환경설계) · `shortBlock`(짧은집중)

모든 성향에 공통으로 **인출·분산이 최고 효용**([F1] Dunlosky 2013)이므로 baseline으로 유지하고, 성향별 매칭은 그 위에 얹는 가중이다.

## 기질별 매칭 (Keirsey 4기질 = 1차 신호)

| 기질 | 유형 | 강점 | 약점(보완) | 매칭 학습법(강점) | 보완 학습법 | 근거 |
|---|---|---|---|---|---|---|
| **SJ 관리자형** | ISTJ·ISFJ·ESTJ·ESFJ | 계획·성실·구조, 메타인지·자기관리 높음 | 개방형·유연 사고 약할 수 있음 | `spacing`·`environment`·`retrieval` | `interleaving`(유연성) | [E3] SJ 메타인지↑, [E1], [F1] |
| **SP 실용형** | ISTP·ISFP·ESTP·ESFP | 실전·문제풀이·적응, 즉흥 실행 | 지속·장기계획 약할 수 있음 | `shortBlock`·`errorAnalysis`·`interleaving` | `spacing`(꾸준함) | [E3] SP 장·단기 목표 실천 필요, [E1] |
| **NT 분석형** | INTJ·INTP·ENTJ·ENTP | 원리·논리·자기설명 | 구체·반복 소홀할 수 있음 | `selfExplanation`·`retrieval`·`errorAnalysis` | `spacing`(반복) | [E3] NT 자기성찰노트·수학일지, [E11] |
| **NF 이상형** | INFJ·INFP·ENFJ·ENFP | 의미·연결·정서 몰입, 자기설명 | 객관 검증·오답 직면 약할 수 있음 | `selfExplanation`·`environment`·`spacing` | `errorAnalysis`(객관화) | [E3] NF 논리 근거 노트, [E4] |

## 4축 보조 조정 (2차, 약한 가중)

| 축 | 조정 학습법 | 근거/직관 |
|---|---|---|
| I 내향 | `environment`·`retrieval` | 조용히 혼자 인출 |
| E 외향 | `selfExplanation`·`interleaving` | 말하며·섞으며 |
| S 감각 | `errorAnalysis`·`interleaving` | 사례·문제 중심 |
| N 직관 | `selfExplanation`·`retrieval` | 원리·개념 |
| T 사고 | `errorAnalysis`·`spacing` | 기준·효율 |
| F 감정 | `environment`·`shortBlock` | 부담 완화 |
| J 판단 | `spacing`·`environment` | 구조·계획 |
| P 인식 | `interleaving`·`shortBlock` | 선택형·유연 |

## 적용 규칙

- 공식 MBTI를 **직접 입력한 경우에만** 매칭을 적용한다(공부습관 4축 탐색 신호는 매칭 입력이 아님).
- 매칭은 추천 점수에 **가중을 더하는 방식**이며, 개인 응답(행동·상태)을 압도하지 않도록 **상한**을 둔다.
- **baseline(무-MBTI) 추천을 항상 함께 산출**해, 매칭이 실제로 결과를 개선하는지 이후 데이터로 비교한다(에이전트 c 수집).
- **교차학습(`interleaving`) 재료 경계([A9] Brunmair·Richter 2019, 구현됨 2026-07-15):** 교차는 개념·유형 변별에는 이점이 크지만(회화 g=0.67), **단어·어휘 암기에는 오히려 집중학습(blocking)이 유리(g=−0.39)**하다. 과제유형(task) 입력 시 **암기 과제는 `interleaving` 가중을 낮추고 `spacing`·`retrieval`을 우선**하는 런타임 규칙이 적용된다(`frontend/src/data/taskState.js`). 과제유형 미입력 시에는 방법 설명 카피에만 이 경계가 노출된다.
- **task/state 입력 = baseline 승격(C-1a, 구현됨 2026-07-15):** Step 5(오늘 계획)에서 과제유형·마감·가용시간을 물으면, 그 답만 반영한(무-MBTI) 결과가 진짜 "task/state baseline"이 된다. MBTI 힌트 추가 모델은 이 baseline에 MBTI 매칭을 더한 값이다. 구현: `frontend/src/data/taskState.js` + `frontend/src/hooks/useAssessmentFlow.js`.
- 코드 구현: `frontend/src/data/mbtiMethodMatching.js`, 적용: `frontend/src/lib/recommendations.js`.
