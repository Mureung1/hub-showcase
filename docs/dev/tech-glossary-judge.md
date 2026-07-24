# 기술 개념 정리 — hub 프로젝트 (Task 1 · 판단/judge)

> 목적: 개인 학습 참고용. Task 1(판단/judge, #9~#13) 동안 코드를 이해하며 물어본 개념을 카테고리별로 정리한다.
> Task 0은 별도 문서 [`tech-glossary.md`](./tech-glossary.md)에 정리되어 있다.
> 관통 사례: hub 프로젝트 `app/agent.py` (`build_candidates` → `_build_judge_prompt` → `_call_judge` → `_validate_coverage` → `judge`)
> 형식: `tech-glossary.md`와 동일 — 용어집형 + ADR형 하이브리드, 등장한 순서(#9 → #13)대로 배치.

---

## 개발/데이터

### state 위치 — "요청 하나 동안만 존재"
**정의**: 데이터가 지금 어디에 있는지(함수 지역 변수인지, 모듈 레벨 상수인지, 디스크 파일인지, 매 요청마다 새로 생기고 사라지는지)를 표시하는 것.
**hub에서는**: `_build_judge_prompt(topic, papers)`의 `topic`·`papers`는 그 호출 하나가 처리되는 동안만 메모리에 있다가, 처리가 끝나면 사라진다 — `config.MAX_RETRY`처럼 서버가 켜져있는 내내 남아있는 값과 대비된다.
**관련**: [[함수 지역 변수 — 힙/스택]]

### run_agent()의 실제 존재 여부 (자기 정정)
**정의**: 없음. `app/agent.py` 최상단 주석에 "run_agent()는 반드시 제너레이터다"라고 적혀 있지만, 이건 CLAUDE.md 스펙을 미리 참조해둔 것일 뿐 실제 함수는 Task 6(오케스트레이션, #45~50)에서 만들 예정이다.
**hub에서는**: 데이터 흐름 다이어그램에 "state: run_agent() 호출 인자"라고 썼다가, 사용자가 "run_agent() 함수가 있어?"라고 직접 확인 요청 → `grep`으로 검색해 존재하지 않음을 확인 → 정정.
**이유**: 아직 없는 코드를 있는 것처럼 전제하고 설명하면, 나중에 실제로 그 함수를 설계할 때 이미 정해진 것처럼 착각하게 된다. 항상 `grep`/파일 확인으로 실제 존재 여부를 검증한 뒤 설명해야 한다.

### 서브이슈 경계와 함수 분리 (자기 정정)
**정의**: 이슈 하나 = 커밋 하나 원칙을 지키려면, 코드의 함수 경계도 이슈 경계와 일치해야 한다.
**hub에서는**: 처음엔 프롬프트 조립(#10)과 LLM 호출(#11)을 `_call_judge()` 한 함수에 합쳐서 설계했다 — "#10, #11을 같이 개발하는거야?"라는 질문에 답하며 문제를 인지하고, `_build_judge_prompt()`(#10, 프롬프트 조립만)와 `_call_judge()`(#11, `_build_judge_prompt()`를 재사용해 LLM 호출)로 분리했다.
**선택**: 기능을 합쳐서 테스트가 편해지는 이점보다, 서브이슈-커밋 경계를 지키는 걸 우선.
**이유 / 기각한 대안**: 합쳐서 짜면 #11의 fallback 테스트가 한 번에 되는 장점은 있지만, 그러면 사실상 두 이슈의 코드를 한 커밋에 쓰는 셈이라 "서브이슈 하나 = 커밋 하나" 규칙(`sub-issue-workflow` Skill)과 어긋난다. 함수를 나눠도 `_call_judge()`가 `_build_judge_prompt()`를 재사용하면 되므로 테스트 편의성은 그대로 유지된다.
**관련**: [[fallback 책임 소재]]

### json.dumps(candidates, ensure_ascii=False)
**정의**: `ensure_ascii`(기본값 `True`)는 비ASCII 문자(한글 등)를 `\uXXXX`로 이스케이프한다. `False`로 두면 원문 그대로(UTF-8) 출력한다.
**hub에서는**: `_build_judge_prompt()`에서 후보 목록을 JSON 문자열로 바꿀 때 `ensure_ascii=False`를 씀.
**선택**: `False`.
**이유**: 실측 결과 같은 데이터가 `True`면 88자, `False`면 58자 — 이스케이프된 한글이 프롬프트 길이(=토큰=비용)를 불필요하게 늘린다. `docs/spec/sse-contract.md`도 같은 이유로 `ensure_ascii=False`를 명시하고 있다.
**관련**: [[SSE(Server-Sent Events)]]

### json.dumps() 단계가 필요한 이유
**정의**: `prompt_loader.fill()`은 문자열 치환(`template.replace(...)`)만 하므로, 프롬프트에 끼워 넣을 값은 반드시 문자열이어야 한다.
**hub에서는**: `candidates`(파이썬 리스트)를 프롬프트에 넣기 전에 `json.dumps()`로 JSON 텍스트로 변환한다.
**이유**: 변환 없이 리스트를 그대로 넘기면 `{papers_json}` 자리에 파이썬 문법(작은따옴표 등, 유효한 JSON 아님)이 그대로 박혀 LLM에게 "이건 JSON이다"라고 말해놓고 실제로는 깨진 JSON을 보내는 꼴이 된다.

### 함수 지역 변수 — 힙/스택
**정의**: CPython에서는 모든 객체(정수 포함)가 힙에 있다. "지역 변수"는 함수 호출 시 생기는 프레임(frame) 안에 "이 이름이 이 힙 객체를 가리킨다"는 참조가 있다는 뜻이지, 데이터 자체가 스택에 쌓인다는 뜻이 아니다.
**hub에서는**: 데이터 흐름 다이어그램에서 "state: 함수 지역 변수"라고 표시한 값들(`candidates`, `prompt`, `covered`, `missing` 등)이 여기 해당한다.
**이유**: 함수가 끝나면 프레임(참조)이 사라지고, 아무도 그 힙 객체를 참조하지 않으면 가비지 컬렉터가 회수한다 — C처럼 스택에 실제 데이터가 있는 모델과 다르다.

### `-> dict` 반환 타입 힌트
**정의**: `def f(...) -> dict:`에서 `->` 뒤의 타입은 **반환 타입 힌트**. 함수가 무엇을 반환할지 사람과 도구(IDE, 타입 체커)에게 알려주는 문서화 장치.
**hub에서는**: `_validate_coverage(papers: list[dict], result: dict) -> dict`처럼 이 프로젝트의 모든 함수에 일관되게 붙임(CLAUDE.md 코드 컨벤션 "타입힌트 사용").
**이유**: 실측 확인 결과, 파이썬은 이 타입을 **런타임에 검사하지 않는다** — `-> dict`라고 써놓고 실제로 문자열을 반환해도 예외가 안 난다. `mypy` 같은 별도 타입 체커를 CI에 안 붙인 이 프로젝트에서는 순전히 사람이 읽을 때의 문서화 목적.

### mock (`unittest.mock.patch.object`)
**정의**: 지정한 이름(예: `tools.ask_llm`)이 가리키는 대상을 테스트 동안만 가짜 객체로 바꿔치기하는 도구.
**hub에서는**: `patch.object(tools, "ask_llm", return_value="가짜 응답")`로 `_call_judge()`가 깨진 응답에도 fallback을 반환하는지(#11) 검증.
**이유**: 파이썬은 함수 안에서 이름을 참조할 때(`ask_llm(prompt)`) 정의 시점이 아니라 **호출되는 순간** 모듈의 이름공간에서 찾는다 — 그래서 `patch.object`로 `tools.ask_llm`을 바꿔치기해두면, `ask_llm_json()` 내부의 `ask_llm(prompt)` 호출이 그 순간 가짜를 찾아 실행한다. `with` 블록이 끝나면 원래 함수로 자동 복구된다.
**관련**: [[mock과 실제 네트워크 요청의 관계]]

### 추상화 (abstraction)
**정의**: "어떻게 하는지"는 감추고 "무엇을 하는지"만 드러내는 것.
**hub에서는**: `ask_llm()`의 docstring("LLM 호출 추상화. 한도 초과 시 Claude Haiku / Ollama로 교체할 때 이 함수만 바꾸면 된다")이 정확한 예 — 호출하는 쪽은 내부가 Gemini인지 Claude인지 몰라도 된다.
**선택**: judge 전용 JSON 파싱 로직을 새로 만들지 않고 `ask_llm_json()`을 재사용.
**이유 / 기각한 대안**: 새로 만들면 "LLM 응답을 안전하게 파싱하는 방법"이 두 곳에 생겨 "이 문제는 한 곳에서만 방어한다"는 CLAUDE.md 원칙이 깨진다.

### fallback 책임 소재
**정의**: fallback 값은 "실패 시 무엇을 반환할지"를 아는 함수, 즉 실제로 LLM을 호출하는 함수의 책임이다.
**hub에서는**: `{"picked": [], "excluded": []}`를 `_build_judge_prompt()`가 아니라 `_call_judge()`에 정의.
**이유**: `_build_judge_prompt()`는 LLM을 호출하지 않으므로 "실패"라는 개념 자체가 없다. fallback까지 그 함수가 알게 하면 "프롬프트 조립"과 "실패 처리"라는 서로 다른 관심사가 한 함수에 섞인다.

### `_` 접두어 컨벤션
**정의**: 파이썬에서 이름 앞의 밑줄은 강제되는 접근 제어가 아니라, "이건 내부 구현이니 외부에서 직접 쓰지 말라"는 관례적 신호일 뿐이다.
**hub에서는**: `judge()`, `build_candidates()`(공개, 다른 모듈이 불러도 됨) vs `_build_judge_prompt()`, `_call_judge()`, `_validate_coverage()`(내부 헬퍼, `judge()` 안에서만 씀).
**이유**: 실측 확인 결과 `_call_judge`도 밖에서 똑같이 접근·호출 가능하다(`hasattr`, `callable` 모두 `True`) — 유일하게 실제로 달라지는 건 `from module import *`일 때 `__all__`이 없으면 `_`로 시작하는 이름이 자동 제외된다는 것뿐.

### "범위 밖으로 남긴다"는 설계 판단
**정의**: 지금 완료 기준에 없는 걸 미리 만들지 않는 것.
**hub에서는**: `judge()`는 `sse-contract.md`의 title 기반 이벤트만 만들고, `select_tool`(Task 2)이 필요로 하는 index 기반 원본 접근은 Task 6이 `_call_judge()`/`_validate_coverage()`를 직접 재사용하도록 남김.
**이유**: 이미 만들어둔 조각(`_call_judge()`, `_validate_coverage()`)이 index를 보존한 채로 존재하므로, Task 6에서 새로 설계할 게 없다 — 지금 `judge()`에 억지로 넣으면 "화면용 이벤트 생성"과 "다음 단계 연결"이라는 다른 관심사가 섞인다.

---

## 인프라/네트워크

### LLM 응답 캐싱 부재 + judge 재시도 없음
**정의**: 이 프로젝트엔 캐시 레이어 자체가 없다 — "캐싱 안 하기로 설계"가 아니라 "캐시가 아예 없어서" 매번 새로 요청이 나간다.
**hub에서는**: `judge.md`를 다시 확인한 결과, judge는 파싱 실패 시 재시도 없이 곧장 `error`로 종결된다(재시도는 3단계 요약↔4단계 검증 사이에만 있음, `config.MAX_RETRY`) — 그래서 "같은 논문으로 재시도할 때 캐싱하면 비용 절감되지 않냐"는 질문의 전제(judge 단계의 재시도) 자체가 이 프로젝트엔 없다.
**이유**: 캐시를 두려면 저장소가 필요한데 CLAUDE.md가 DB를 금지하고, "요청 순간 실행"이 핵심 설계라 매번 최신 검색 결과로 판단하는 게 맞다.

### mock과 실제 네트워크 요청의 관계
**정의**: `tools.ask_llm`을 mock으로 바꿔치기하면 진짜 함수 몸체(내부의 `genai.configure()` + `generate_content()`)가 아예 실행되지 않는다.
**hub에서는**: #11(`_call_judge()`의 fallback)을 mock으로 검증할 때 Gemini 서버로 실제 요청이 한 건도 안 나갔다 — 무료 티어 quota를 안 쓰고 실패 처리를 검증할 수 있는 이유.
**관련**: [[mock (unittest.mock.patch.object)]]

### SSE(Server-Sent Events)
**정의**: 서버가 응답을 끝내지 않고 연결을 열어둔 채, 이벤트가 생길 때마다 `data: {...}\n\n` 형태로 계속 흘려보내는 방식. 브라우저의 `EventSource`가 이 스트림을 받는다.
**hub에서는**: `judge()`가 만드는 dict가 `docs/spec/sse-contract.md`에 정의된 `judge` 이벤트(`stage`/`total`/`selected`/`picked`/`excluded`)와 정확히 같은 모양이어야 한다.
**선택**: WebSocket도 폴링도 아닌 SSE.
**이유 / 기각한 대안**: 이 서비스는 "브라우저→서버"는 요청 한 번뿐이고 "서버→브라우저"만 계속 흘러야 하는 단방향 스트리밍이라, 양방향인 WebSocket은 과하다. 폴링은 몇 초마다 "다 됐어?"를 계속 물어봐야 해서 5단계·몇십 초짜리 작업엔 비효율적이고 실시간성도 떨어진다.
**주의**: `data: ` + JSON + **빈 줄(`\n\n`)** 하나라도 빠지면 브라우저가 이벤트 경계를 못 알아본다. JSON은 `ensure_ascii=False` — 이유는 [[json.dumps(candidates, ensure_ascii=False)]]와 동일.

---

## 비즈니스/서비스

Task 1(#9~#13)에도 이 카테고리에 해당하는 질문은 없었다. Task 0과 마찬가지로 전부 코드 동작 원리(개발/데이터)와 그 코드가 맞닿는 외부 시스템·프로토콜(인프라/네트워크)에 집중되어 있었다.
