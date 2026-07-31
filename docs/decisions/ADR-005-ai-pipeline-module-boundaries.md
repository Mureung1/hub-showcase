# ADR-005: AI 파이프라인 모듈 경계 (포트 & 어댑터)

- 상태: Accepted
- 날짜: 2026-07-22

## 배경

백엔드 AI 파이프라인은 다섯 관심사를 사용자가 실험하며 갈아끼울 필요가 있다(제품 요구): ① Provider 호출 방식, ② 답변 프롬프트, ③ 원문→Section 정규화, ④ 답변의 어젠다 분류 기준, ⑤ Section 간 비교(충돌) 판정 기준. `CLAUDE.md` 8장은 이미 "Provider 응답의 공통 스키마 정규화 / 답변·Manager 프롬프트의 `/prompts` 버전관리 / 외부 데이터 Zod 계약"을 요구한다. 이 이음새를 인터페이스(포트)로 명시해 구현 교체를 가능하게 한다.

## 결정

AI 파이프라인을 **7개 포트**로 분리한다. 각 포트는 안정된 입출력 계약과 `version` 문자열을 가진다. (시그니처는 개념 수준 — 실제 타입은 구현 Spec에서 확정)

1. **ProviderClient** — `generate(req) → RawResult`. Provider별 어댑터, 레지스트리(`Map<AiProvider, ProviderClient>`)로 등록. SDK·타임아웃·재시도를 캡슐화. → **SPEC-AI-001**
2. **AnswerPromptTemplate** — `build({question, context, provider}) → PromptPayload`, `version`. `/prompts`에 provider별·버전별. → **SPEC-AI-001**
3. **AnswerNormalizer** — `normalize(raw) → StructuredContent`(Zod 검증). Provider 호출과 분리해 파싱·구획화만 담당. → **SPEC-AI-001**
4. **AgendaClassifier** — `classify(sourceAnswers) → AgendaDraft[]`. 답변을 어젠다로 나누는 분류 기준. → **SPEC-AI-002**
5. **ConflictComparator** — `compare(agendaDraft) → ComparisonResult`(consensus/conflict). Section 간 비교·충돌 판정 기준. → **SPEC-AI-002**
6. **AgendaRechecker** — `recheck({agenda, firstJudgment, userRequest}) → RecheckResult`. 사용자 요청에 대한 재검토 설명·근거 제시. → **SPEC-AI-002**

7. **FinalAnswerComposer** — `compose({agendas, generationMode, excludedProviders}) → {finalAnswer, decisionNote}`. 확정된 쟁점들을 종합해 최종 답변과 결정 기록을 생성. → **SPEC-AI-003**

> **7번은 2026-07-31 추가.** `ConflictComparator`와 입력(쟁점 1개의 섹션 원문 vs 확정된 Agenda 전체)·출력(`stances`·`disagreementType` vs `finalAnswer`·`decisionNote`)·성격(판정 vs 종합)이 하나도 겹치지 않는다. 프롬프트 버전과 `reasoning` 설정도 독립적으로 움직인다 — SPEC-AI-003 §3.4가 "단계 6과 특성이 다르므로 무설정으로 시작"을 명시했다.

> **6번은 2026-07-31 추가.** 초판은 5개였다. SPEC-AI-002 §10.1이 재검토를 *"판정을 뒤집는 장치가 아니라 사용자가 결정하도록 돕는 장치"*로 규정하면서, `ConflictComparator`와 관심사가 갈렸다 — 입력(1차 판정 + 사용자 요청)도 출력(`response`·`citations`·`revisedType`)도 겹치지 않는다. 같은 포트에 넣으면 한 인터페이스가 두 관심사로 갈라진다. "이음새당 인터페이스 하나, 초기 구현 하나" 원칙은 그대로 지켜진다.

**교체 메커니즘 — 설정 선택 + 버전 스탬프**

- 인터페이스 뒤에 여러 구현·버전이 공존하고, 활성 구현·버전은 **설정(config/env)** 으로 선택한다(초기엔 포트당 버전 1개로 최소 시작).
- 실제 사용한 버전을 **저장 레코드에 스탬프**한다: `source_answers.prompt_version`(호출·프롬프트·정규화), `agendas.prompt_version`(분류·비교). 교체 가능성과 **재현성**(관측 요구)을 동시에 만족한다.
- 선택 키(env)가 늘어나므로 `apps/api` env 검증에 포함하고 기본값을 둔다.

**범위 원칙 — "프레임워크가 아니라 이음새"**

- 이음새당 인터페이스 하나, 초기 구현 하나. 플러그인 로더·동적 로딩 같은 범용 확장 장치는 만들지 않는다(`CLAUDE.md` 12·13 — 확인된 요구에 한정한 최소 추상화).
- 경계(인터페이스)는 지금 5개 모두 이 ADR에서 확정한다. **코드 구현·배선은 각 포트가 실제 실행되는 Spec에서** 한다: provider·prompt·normalizer = SPEC-AI-001, classifier·comparator = SPEC-AI-002. **실행되지 않는 빈 구현 코드는 만들지 않는다**(분류·비교는 AI-001 슬라이스에서 아직 브라우저 Mock이므로 서버 호출 지점이 없다).

## 결과

- 사용자는 호출·프롬프트·정규화·분류·비교를 인터페이스 뒤에서 버전으로 갈아끼우고 롤백할 수 있다.
- 저장된 버전 스탬프로 "이 결과가 어떤 구현·기준으로 나왔는지"를 재현·감사할 수 있다.
- classifier·comparator의 입출력 계약은 SPEC-AI-002에서 분류·비교 기준을 확정할 때 이 ADR의 코스한 시그니처를 구체화한다(재작업 최소).
- SPEC-AI-001은 §2.3에 provider·prompt·normalizer 포트 구조를, 후속 연결(§12)에 classifier·comparator=AI-002를 반영한다.
- 과도한 추상화 위험은 "이음새당 최소 하나"와 "빈 코드 금지"로 억제한다.
