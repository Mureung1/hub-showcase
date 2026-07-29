# 기술 개념 정리 — hub 프로젝트 (Task 3 · 요약/summarize)

> 목적: 개인 학습 참고용. Task 3(요약/summarize, #22~#26) 동안의 설계 결정을 정리한다.
> Task 0은 [`tech-glossary.md`](./tech-glossary.md), Task 1은 [`tech-glossary-judge.md`](./tech-glossary-judge.md),
> Task 2는 [`tech-glossary-select-tool.md`](./tech-glossary-select-tool.md)에 있다.
> **이번엔 `hub-learner-persona` 서브에이전트를 처음 실전 투입했다.** 각 라운드(전략→구현)
> 전에 이 에이전트가 사용자 본인의 질문 패턴을 모델링해 카테고리별 예상 질문을 던졌고,
> 그 답변을 그대로 정리했다 — 그래서 이 문서는 실제 대화형 Q&A는 아니지만, 사용자의
> 질문 스타일을 반영한 검토를 거친 기록이다.
> 관통 사례: hub 프로젝트 `app/agent.py`, `app/prompt_loader.py`, `app/config.py`

---

## 개발/데이터

### 프롬프트 명세와 코드 구현의 시점 차이
**정의**: `prompts/*.md`는 Task 0 이전부터 5단계 전부 미리 작성된 설계 문서(명세)이고, 그걸 실행하는 `.py` 코드는 Task마다 순차적으로 구현된다.
**hub에서는**: `prompts/verify.md`가 파일로 이미 존재하는데 `verify()` 함수(Task 4)는 아직 없다. 처음엔 이게 Task 1의 "`run_agent()`가 없는데 있는 것처럼 설명" 문제와 같아 보였지만, 성격이 다르다.
**이유**: `run_agent()` 문제는 아직 없는 **코드**를 이미 있는 것처럼 전제한 것이었고, `verify.md`는 "이 단계의 계약이 이미 확정됐다"는 뜻일 뿐 코드 존재를 주장한 게 아니다 — `docs/spec/sse-contract.md`가 코드보다 먼저 확정되는 것과 같은 "명세 우선" 원칙.

### `load_feedback_block()` — 인자를 뺀 이유
**정의**: `prompt_loader.py`에 추가한 함수. `summarize.md`의 `### {feedback_block}` 하위 블록만 뽑는다.
**hub에서는**: 레퍼런스(`week1-first-pass`)엔 있었지만 이번 세션이 Task 0(#44)에서 다시 만든 버전엔 없었다.
**선택**: `load_feedback_block(name)`이 아니라 인자 없는 `load_feedback_block()`, `summarize.md` 고정.
**이유 / 기각한 대안**: `load(name)`은 5단계 전부가 호출자라 `name`이 필요하지만, `feedback_block` 패턴은 지금 summarize 하나뿐이다. Task 1(#13)의 "지금 완료 기준에 없는 걸 미리 만들지 않는다"는 원칙과 반대 방향이라 기각 — 다른 단계도 필요해지면 그때 인자를 추가한다.

### 매직넘버 → `config.SUMMARIZE_PARSE_ATTEMPTS`
**정의**: JSON 파싱 실패 시 같은 프롬프트로 재시도하는 횟수(3).
**hub에서는**: 처음엔 `_call_summarize()` 안에 `attempts=3`으로 리터럴을 박았다가, `config.py`로 옮겼다.
**이유 / 기각한 대안**: `config.MAX_RETRY`(=2, 요약↔검증 왕복 횟수)를 재사용하는 것도 고려했지만, 둘은 완전히 다른 재시도 개념(파싱 실패 재시도 vs 검증 왕복)이라 이름이 겹치면 헷갈린다. CLAUDE.md의 "매직넘버 지양 → config.py로" 원칙에 따라 `SUMMARIZE_PARSE_ATTEMPTS`라는 별도 이름으로 분리했다.

### `fallback=None` — judge/select_tool과 다른 이유
**정의**: `_call_summarize()`가 3회 다 실패하면 `None`을 반환한다(dict가 아님).
**hub에서는**: judge의 fallback `{"picked": [], "excluded": []}`, select_tool의 `{"need_fulltext": False, ...}`와 다른 패턴.
**이유**: judge/select_tool의 "빈 선택"·"본문 불필요"는 실제로 있을 수 있는 정상 결과라 dict가 자연스럽다. 요약 실패는 "보여줄 수 있는 값이 없는" 상태라, 가짜 빈 요약(`{"contribution": "", ...}`)을 반환하면 진짜 요약처럼 오해될 수 있다. `None`은 호출하는 쪽이 반드시 명시적으로 실패 분기를 타게 강제하는 신호다.

### mock 검증의 실제 의미 — "안전하다"가 아니라 "안 건드린다"
**정의**: `_call_summarize()`가 `ask_llm_json()`의 결과를 도중에 변형하지 않고 그대로 반환하는지 확인하는 mock 테스트.
**hub에서는**: #26 검증에서, 성공 응답을 mock해 반환된 dict가 원본과 정확히 일치하는지 확인했다.
**이유 / 한계**: 이 테스트는 "코드가 값을 안 건드린다"는 것만 증명하지, 그 dict가 항상 올바른 형태(정확히 3개 키)라는 걸 보장하지 않는다 — `ask_llm_json()`은 "유효한 JSON인지"만 확인하지 스키마(키 이름·개수)는 검사하지 않는다. 이건 실제 갭이지만 #22~#26 어느 완료 기준에도 요구되지 않아 이번 Task 범위 밖으로 남겼다.

### "코드도 커밋도 없는 완료" — #22, #26
**정의**: 이슈의 완료 기준이 이미 다른 이슈의 커밋만으로 충족되어, 새 코드나 커밋 없이 검증만으로 끝나는 경우.
**hub에서는**: #22는 Task 2의 `_read_source()`로, #26은 같은 Task 3의 `_call_summarize()`(#24/#25 커밋)로 이미 충족됐다.
**이유**: Task 2의 #17+#18, #19+#20("여러 이슈가 같은 새 코드를 공유")보다 한 단계 더 나아간 경우("아예 새 코드가 없음")다. 커밋 메시지를 사후에 고치는 것(히스토리 재작성)보다, PR 설명에 "이 커밋으로 이미 충족됨"이라고 명시하는 쪽이 더 정직하다고 판단했다.

---

## 인프라/네트워크

### LLM 재시도에는 백오프가 없다 (알려진 한계, 이번 범위 밖)
**정의**: `tools.ask_llm_json()`의 `attempts` 재시도 루프는 실패해도 대기 없이 곧바로 다음 시도를 한다.
**hub에서는**: `arxiv.Client(delay_seconds=3.0)`처럼 arXiv 쪽엔 관례적 대기가 있지만, Gemini 호출 재시도엔 없다.
**이유**: CLAUDE.md가 "재시도·백오프 처리. rate_limit_exceeded는 예외가 아니라 일상이다"라고 명시하고 있어 원칙적으로는 있어야 하지만, 이건 Task 0에서 이미 만들어 병합된 `ask_llm_json()`의 한계이고 이번 서브이슈(#24, 호출 횟수 확인)의 완료 기준과는 무관해 손대지 않았다.
> 🔄 변경 가능 정보 · 확인일: Task 3 진행 시점 · 후속 조치 필요 시 별도 이슈로 다룰 것.

### 최악의 경우 quota 소모량
**정의**: 논문 한 편이 요약 3회 재시도 + 검증 왕복(`MAX_RETRY+1`=3회)까지 겹치면, CLAUDE.md가 명시한 "4회 이상"보다 훨씬 많은 LLM 호출이 날 수 있다.
**hub에서는**: 개발 중 `--limit 3` 이하로 돌리라는 규칙이 왜 있는지를 구체적 수치로 재확인.

---

## 비즈니스/서비스

Task 3에도 이 카테고리에 해당하는 내용은 없다.
