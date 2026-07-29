# 기술 개념 정리 — hub 프로젝트 (Task 2 · 도구 선택/select_tool)

> 목적: 개인 학습 참고용. Task 2(도구 선택/select_tool, #16~#20) 동안의 설계 결정을 정리한다.
> Task 0은 [`tech-glossary.md`](./tech-glossary.md), Task 1은 [`tech-glossary-judge.md`](./tech-glossary-judge.md)에 있다.
> **이 문서는 앞의 두 문서와 성격이 다르다.** Task 2는 "자동으로 구현해" 요청에 따라
> 서브이슈별 전략 제시·질문·답변 없이 진행됐다 — 그래서 용어집 항목은 거의 없고,
> 구현 중 실제로 내린 설계 판단(ADR)만 기록한다. 나중에 이 판단들을 되짚어볼 때
> "왜 그렇게 짰는지" 질문거리를 스스로 만들어보는 용도로 쓸 수 있다.
> 관통 사례: hub 프로젝트 `app/agent.py` (`_iterate_picked` → `_select_tool` → `_read_source`)

---

## 개발/데이터

### 서브이슈 5개, 커밋 3개 — 함수 경계와 이슈 경계가 항상 일치하지 않음
**선택**: #17(성공 경로)+#18(fallback)을 `_select_tool()` 한 함수·한 커밋으로, #19(성공 경로)+#20(fallback)을 `_read_source()` 한 함수·한 커밋으로 묶음.
**이유 / 기각한 대안**: Task 1의 judge에서는 `_build_judge_prompt()`(#10)와 `_call_judge()`(#11)를 분리했는데, 그건 `json.dumps()`로 후보 목록을 직렬화하는 **독립적으로 테스트할 단계**가 있었기 때문이다. select_tool은 `title`+`abstract`를 바로 프롬프트에 채울 뿐 그런 중간 단계가 없고, `tools.ask_llm_json()`·`tools.fetch_fulltext()`가 이미 Task 0에서 성공/실패 두 경로를 한 번에 처리하도록 만들어져 있어서, "성공 시 형태"와 "실패 시 fallback"을 서로 다른 함수로 쪼갤 이유가 없었다. 억지로 쪼개면 사실상 같은 코드를 두 커밋에 나눠 쓰는 셈이라 오히려 부자연스럽다.
**관련**: [[tech-glossary-judge.md의 "서브이슈 경계와 함수 분리"]]

### `_select_tool()` 반환 타입 — dict vs tuple
**선택**: `dict {"need_fulltext": bool, "reason": str}` 반환.
**이유 / 기각한 대안**: 레퍼런스(`week1-first-pass:app/tools.py`)는 `tuple[bool, str]`을 반환하지만, 이슈 #17의 완료 기준이 정확히 `{"need_fulltext": bool, "reason": str}` **형태**를 요구했다. 완료 기준이 레퍼런스보다 우선한다 — 레퍼런스는 참고용이지 명세가 아니다.

### `_read_source()`의 반환값 — `(source_text, used_fulltext)` 튜플
**정의**: 실제로 요약에 쓸 텍스트와, 본문을 실제로 썼는지 여부를 함께 반환.
**hub에서는**: `need_fulltext=True`인데 `fetch_fulltext()`가 실패(None)하면 `source_text`는 초록으로, `used_fulltext`는 `False`로 **둘 다** 되돌린다.
**이유**: 레퍼런스의 `run_agent()`을 보면 이 두 값이 항상 같이 쓰인다 — `source_text`는 다음 단계(요약)의 입력으로, `used_fulltext`는 `read` 이벤트의 `used_fulltext` 필드(사용자에게 "본문까지 읽음" 배지를 보여주는 근거)로 쓰인다. 둘을 따로 반환하면 호출하는 쪽이 항상 두 함수를 세트로 불러야 해서 실수 여지가 생긴다.

### 제너레이터 스타일 — `_iterate_picked()`
**선택**: `return` 대신 `yield`를 쓰는 제너레이터로 작성.
**이유**: `run_agent()`가 "반드시 제너레이터"라는 CLAUDE.md 아키텍처 불변식과 스타일을 맞춤 — Task 6에서 `run_agent()` 안에 이 순회 로직을 그대로 끼워 넣을 수 있다.

---

## 인프라/네트워크

### `fetch_fulltext()` 재사용 — 네트워크 계층을 다시 안 만듦
**정의**: PDF 다운로드(`urllib.request.urlopen`)와 텍스트 추출(`PdfReader`)은 Task 0(Sub 0-3)에서 이미 만들고 검증(실제 PDF에서 39,611자 추출, 존재하지 않는 URL에도 예외 없이 None 반환)했다.
**hub에서는**: `_read_source()`는 이 함수를 그대로 부르고, "실패 시 초록으로 대체"라는 **agent 레벨의 연결 로직**만 새로 추가했다.
**이유**: 네트워크 I/O 계층(`tools.py`)과 에이전트 판단 로직(`agent.py`) 사이의 역할 분리(CLAUDE.md 의존 방향 규칙 — `agent.py → tools.py`, 역방향 금지)를 그대로 지킨 것.

---

## 비즈니스/서비스

Task 2에도 이 카테고리에 해당하는 내용은 없다.
