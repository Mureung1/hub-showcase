# 기술 개념 정리 — hub 프로젝트 (Task 4 · 자기 검증/verify)

> 목적: 개인 학습 참고용. Task 4(자기 검증/verify, #28~#32) 동안의 설계 결정을 정리한다.
> Task 0은 [`tech-glossary.md`](./tech-glossary.md), Task 1은 [`tech-glossary-judge.md`](./tech-glossary-judge.md),
> Task 2는 [`tech-glossary-select-tool.md`](./tech-glossary-select-tool.md), Task 3은 [`tech-glossary-summarize.md`](./tech-glossary-summarize.md)에 있다.
> 각 서브이슈의 전략 제시 직후 `hub-learner-persona` 서브에이전트가 사용자 본인의 질문 패턴을
> 모델링해 카테고리별 예상 질문을 던졌고, 그 답변을 정리했다.
> 관통 사례: hub `app/agent.py`의 `_verify_loop` 계열, `tests/test_verify.py`
> 항목은 서브이슈 등장 순서(4-1→4-5)대로, 카테고리별로 묶었다.

---

## 개발/데이터

### dict를 프롬프트에 넣을 때 — `json.dumps` 없이 넣으면 JSON이 깨진다 (4-1)
**정의**: 파이썬 dict의 `str()`/`repr()`은 `{'key': 'value'}`처럼 **홑따옴표**를 쓰는 파이썬 리터럴 표기이고, JSON은 **쌍따옴표만** 허용한다.
**hub에서는**: `_build_verify_prompt()`가 요약 dict를 `{summary_json}` 자리에 넣는다. `prompt_loader.fill()`은 `str(value)`로 치환하므로([prompt_loader.py:46](../../app/prompt_loader.py#L46)), dict를 그냥 넘기면 홑따옴표 repr이 들어가 "JSON을 출력하라"는 프롬프트 계약이 깨진다.
**선택**: `json.dumps(summary, ensure_ascii=False)`로 먼저 직렬화한 문자열을 넘긴다.
**이유**: `json.dumps`는 쌍따옴표를 쓰고 `None→null`·`True→true`·특수문자 이스케이프까지 JSON 규격으로 처리한다. 이 한 줄이 4-1 서브이슈의 본질이었다.

### `summary: dict` 타입힌트는 "None 배제 계약"이다 (4-1)
**정의**: `_call_summarize()`는 3회 파싱 실패 시 `None`을 반환할 수 있는데, `_build_verify_prompt(summary: dict)`는 타입을 `dict`로 고정했다.
**hub에서는**: `summary`에 `None`이 들어오면 `json.dumps(None)`이 `"null"`을 프롬프트에 박는다.
**이유 / 책임 경계**: verify는 **요약 성공 경로에서만** 호출된다. `None`(=`paper_failed` 경로)일 때 verify를 건너뛰는 분기는 Task 6 오케스트레이션(#48/#49)의 몫이다. 타입힌트 `dict`가 "여긴 성공한 요약만 온다"는 전제조건을 문서화한다 — 4-1이 None을 방어하지 않는 게 맞다.
**관련**: [검증 실패 요약을 채택하는 이유](#검증을-끝내-통과-못-한-요약을-채택하는-이유--부분-결과-철학-4-5)

### verify는 파싱 실패해도 재시도하지 않는다 — `attempts=1` (4-1)
**정의**: `_call_verify()`는 `ask_llm_json(prompt, fallback={"is_good": True})`로 기본 `attempts=1`을 쓴다. summarize는 `attempts=SUMMARIZE_PARSE_ATTEMPTS`(=3)를 쓴다.
**hub에서는**: 같은 `ask_llm_json`을 쓰지만 재시도 횟수가 다르다.
**이유**: summarize는 요약을 잃으면 `paper_failed`라 비싸서 3회 파싱 재시도한다. verify의 파싱 실패 → fallback `is_good=True`는 **이미 "비용이 덜 드는 통과 쪽"**이라 재요청할 이유가 없다. 그리고 이 `attempts`(파싱 재시도)는 `config.MAX_RETRY`(=2, 요약↔검증 **왕복** 횟수)와 완전히 다른 축이다 — verify에서 `attempts=1`을 쓰는 것 자체가 두 개념을 섞지 않는다는 증거다.

### 자기 정정 — "정확히 대칭"은 부정확했다 (4-1)
**정의**: 처음엔 `_build_verify_prompt`/`_call_verify`가 summarize의 `_build`/`_call`과 "정확히 대칭"이라고 설명했다.
**hub에서는**: `_build_summarize_prompt`엔 `feedback_block` 조립 분기가 있지만([agent.py:113](../../app/agent.py#L113)), `_build_verify_prompt`엔 그 분기가 없다.
**정정**: "형태(build/call 2분할)만 대칭, 내부는 verify가 더 얕다"로 고쳤다. feedback은 **verify가 생산하고 summarize가 소비**하므로(방향성), verify는 자기가 만든 걸 되받지 않아 분기가 필요 없다.

### monkeypatch가 먹히는 이유, 그리고 테스트 도구 선택 (4-2)
**정의**: `monkeypatch`는 pytest **내장 fixture**(별도 설치 없음, 테스트 끝나면 자동 원복). `unittest.mock.patch`는 표준 라이브러리(호출 검증 기능이 더 많음).
**hub에서는**: `monkeypatch.setattr("app.tools.ask_llm", 가짜)`로 깨진 응답을 재현한다. `_call_verify`→`tools.ask_llm_json`→`ask_llm` 경로인데, `ask_llm`은 **호출 순간 `tools` 모듈 네임스페이스에서 이름으로 조회**된다(값이 미리 복사되는 게 아님) — 그래서 그 이름만 바꿔치면 실제 Gemini 호출 없이 가짜가 불린다. patch 대상이 `app.agent.ask_llm`이 아니라 **이름이 실제 조회되는** `app.tools.ask_llm`인 이유다.
**선택 / 대안**: 함수를 통째 교체만 하면 되므로 monkeypatch가 관용적·간결하다. "호출마다 다른 값"이 필요할 땐 `iter([...])`+`next()`를 직접 콜러블로 준다 — `unittest.mock`을 썼다면 `Mock(side_effect=[...])`가 같은 일을 더 간결히 했을 것.

### 커밋 타입 — 순수 테스트 추가는 `Test`다 (4-2)
**정의**: CLAUDE.md 커밋 타입 표에 `Feat`·`Test`가 따로 있다.
**hub에서는**: 4-2는 fallback이 이미 4-1에 배선돼 있어 **프로덕션 로직 0줄 변경, 테스트만 추가**였다.
**선택 / 이유**: `Feat`이 아니라 `Test(verify): 4-2 ...`. "프롬프트 수정은 Feat" 규칙은 프롬프트가 런타임 자산이라서인데, 순수 테스트 추가엔 해당 없다. (반대로 4-3~4-5는 로직+테스트라 `Feat`.)

### 자기 정정 — 테스트 범위를 좁혔다 (4-2)
**정의**: 처음 4-2 전략은 테스트 케이스 2개(비-JSON 응답 + `ask_llm` 예외)를 계획했다.
**정정**: 페르소나가 "예외 케이스는 `ask_llm_json`의 `except`(Task 0 인프라)를 재테스트하는 것"이라 짚었고, 동의해 **비-JSON 단일 케이스로 축소**했다. 완료 기준의 "깨진 응답"은 *형식이 망가진 응답*이지 호출이 터지는 예외가 아니다. verify가 증명할 **고유의 사실**은 "fallback 값이 하필 `{"is_good": True}`"라는 점뿐이고, 그건 한 케이스로 정확히 증명된다.

### 함수 → 제너레이터로 "점진적으로" 바뀔 수 있는 이유 (4-3→4-4)
**정의**: 함수 본문에 `yield`가 하나라도 있으면 파이썬이 그 코드 객체에 `CO_GENERATOR` 플래그를 세운다. 이 판정은 **정의(컴파일) 시점**에 확정된다(호출마다가 아니라).
**hub에서는**: 4-3의 `_verify_loop`은 `yield`가 없어 일반 함수(`-> tuple[dict, int]`), 4-4에서 `yield`를 넣어 제너레이터(`-> Generator[dict, None, tuple[dict, int]]`)가 됐다.
**이유**: 서로 다른 소스가 각각 컴파일되는 것이라 "점진적으로 성격이 바뀐다"가 성립한다. 각 커밋 시점의 타입힌트는 그 시점 실제 타입과 일치하므로 거짓 정보가 아니다 — 4-4의 제너레이터화가 힌트 갱신까지 포함한다. 호출자(Task 6)가 아직 없어 시그니처 변경이 아무것도 깨지 않았다.

### `yield from`이 `return`값을 넘기는 방식 — PEP 380 (4-3→4-4)
**정의**: 제너레이터의 `return x`는 `StopIteration(x)`로 감싸지고, `yield from`이 그 `StopIteration.value`를 자동으로 꺼내 대입식의 값으로 돌려준다(PEP 380, Python 3.3).
**hub에서는**: `_verify_loop`은 retry 이벤트를 `yield`하며 최종 `(summary, retried)`를 `return`한다. Task 6의 `run_agent`가 `summary, retried = yield from _verify_loop(...)`로 받게 된다.
**이유**: 원래 제너레이터는 값을 return할 수 없었는데, PEP 380이 제너레이터를 **서브루틴처럼 위임**하면서 "하위 제너레이터의 최종 결과를 상위로 넘기는" 통로로 이 메커니즘을 얹었다. "이벤트는 흘리고 최종 요약은 반환"하는 이중 성격에 정확히 맞는다.

### `verdict.get("is_good", True)` — fallback이 있는데도 기본값을 또 두는 이유 (4-3)
**정의**: `_call_verify`의 fallback `{"is_good": True}`는 **파싱 실패 때만** 보장된다.
**hub에서는**: `_verify_loop`이 `verdict.get("is_good", True)`, `.get("feedback", "")`로 다시 방어한다.
**이유 / 중복 아님**: 파싱이 **성공**하면 LLM의 JSON이 그대로 반환되는데, LLM이 `is_good`/`feedback` 키를 빠뜨린 **유효 JSON**을 줄 수 있다(LLM은 형식을 반드시 어긴다). 그 경우 fallback은 안 타므로 `.get` 기본값이 유일한 방어다. 기본값도 "통과 쪽/빈 문자열"로 일관 — 빈 feedback이면 재요약이 이전과 같이 돌 뿐 죽지 않는다.

### `Generator[YieldType, SendType, ReturnType]` — 세 파라미터의 의미 (4-4)
**정의**: `collections.abc.Generator`의 제네릭 세 축 = **yield하는 값 타입** / `.send()`로 밖에서 넣는 값 타입 / `return`으로 내보내는 값 타입.
**hub에서는**: `Generator[dict, None, tuple[dict, int]]` = retry 이벤트(dict)를 yield, send는 안 씀(None), 최종 `(요약, retried)`를 return. "이벤트를 흘리며 최종값을 반환"하는 함수라 세 축을 다 적어야 정확하다.

### 제너레이터 "drain" — `list()`로는 안 되는 이유 (4-4)
**정의**: "drain(소진)"은 파이썬 키워드가 아니라 제너레이터를 끝까지 돌려 비우는 통용어다.
**hub에서는**: 테스트에서 `_verify_loop`을 소비하며 **yield된 이벤트 목록과 `return`값을 둘 다** 회수해야 해서 `_drain(gen)` 헬퍼를 만들었다.
**이유 / 대안 기각**: `list(gen)`은 yield된 값만 모으고 **`return`값(`StopIteration.value`)을 버린다.** 우린 채택 요약+retried가 필요하므로, `next()`로 돌리다 `StopIteration`을 잡아 `.value`까지 회수해야 한다 — `list()`로는 불가능하다.

### fail-fast 스텁 — `raise NotImplementedError` (4-4→4-5)
**정의**: 미완성 분기를 조용히 두지 않고 즉시 크게 실패시키는 원칙이 **fail-fast**. `NotImplementedError`는 파이썬이 스텁을 fail-fast로 표시하는 관용 예외다.
**hub에서는**: 4-4가 상한 도달 자리를 `raise NotImplementedError("... 4-5")`로 두었고, 4-5가 이를 `return summary, retried`로 교체했다.
**이유 / 유의**: `return summary, retried  # 임시`처럼 **조용히 틀린 값**(재시도 안 한 요약)을 반환하면 위험하다. `raise`는 "여긴 4-5가 채운다"를 큰 소리로 표시하고 오용 시 즉시 터진다. 헷갈리기 쉬운 `NotImplemented`(연산자 오버로딩에서 **반환**하는 싱글턴 값)와는 완전히 다르다 — 우린 예외인 `NotImplementedError`를 `raise`했다.

---

## 인프라/네트워크

### `ensure_ascii=False` — 전송 인코딩이 아니라 "LLM이 읽는 내용" (4-1)
**정의**: `json.dumps(ensure_ascii)`는 파이썬 문자열 안에 한글을 그대로 둘지(`가`) `가`로 이스케이프할지만 정한다.
**hub에서는**: 프롬프트에 넣는 `summary_json`을 `ensure_ascii=False`로 만든다.
**이유**: HTTP 전송은 어느 쪽이든 UTF-8이라 **전송 무결성엔 차이 없다.** 다만 `True`면 프롬프트 안에 `가` 같은 **리터럴 이스케이프 문자열**이 들어가 LLM이 그대로 텍스트로 읽어 품질·토큰이 나빠진다. SSE 계약이 `ensure_ascii=False`를 강제하는 것과 같은 이유(사람/모델이 읽어야 함)다.

### `conftest.py` — 내용이 아니라 "위치"가 목적 (4-2)
**정의**: 파이썬 import는 `sys.path`에 있는 디렉토리에서만 모듈을 찾는다.
**hub에서는**: bare `pytest`(CLAUDE.md 개발 명령)는 `tests/`만 `sys.path`에 넣어 `import app`(repo 루트)이 실패한다. repo 루트에 **빈** `conftest.py`를 두면 pytest가 수집 초기에 그 파일을 import하며 그 디렉토리(루트)를 `sys.path`에 넣어 `import app`이 된다.
**이유**: 파일 **내용과 무관하게 위치만으로** 동작이 바뀐다. `python -m pytest`는 cwd를 넣어 이 파일 없이도 되지만, 명령을 `pytest`로 통일하려고 뒀다.
**관련 안전장치**: `monkeypatch.setattr`은 대상 속성이 없으면(경로 오타) 기본적으로 `AttributeError`로 셋업에서 터진다 — 잘못 걸리면 큰 소리로 실패하지 슬쩍 실제 API로 새지 않는다.

### `yield`의 실시간성 — 모아서 return하면 감사 기록이 죽는다 (4-4)
**정의**: `_verify_loop`이 제너레이터라 `retry` 이벤트를 `yield`하는 순간 `run_agent`(Task 6)가 받아 즉시 `data: {...}\n\n`으로 흘려보낸다.
**hub에서는**: 만약 리스트에 모아 마지막에 반환했다면 retry 이벤트가 `paper_done`보다도 늦게 한꺼번에 도착한다.
**이유**: 그러면 "스스로 점검 중"이라는 실시간 증거(sse-contract 하이라이트 2 · 재시도 로그)가 죽는다. 제너레이터가 선택이 아니라 필수인 지점이다.

### 최악의 경우 논문 한 편당 LLM 호출 수 (4-5)
**정의**: 상한 소진 시 `select_tool` 1 + `summarize`(초기) 1 + `verify` 3(최초1+재시도2) + 재요약 2 = **논문당 약 7회**(+요약 파싱 재시도 시 더). `judge`는 논문별이 아니라 실행당 1회(배치).
**hub에서는**: CLAUDE.md "1편당 4회 이상(판단·도구선택·요약·검증)"은 **재시도 없는 최소값(하한)**이라 "이상"이 맞다.
**이유**: 개발 중 `--limit 3` 이하 습관이 왜 중요한지를 구체 수치로 재확인. 무료 티어를 오전에 태우지 않으려는 것.

---

## 비즈니스/서비스

### 검증을 끝내 통과 못 한 요약을 채택하는 이유 — "부분 결과" 철학 (4-5)
**정의**: `MAX_RETRY` 왕복을 다 써도 `is_good=False`면, `_verify_loop`은 마지막 재요약을 **버리지 않고** `(summary, retried)`로 반환한다.
**hub에서는**: 이 요약은 verify를 한 번도 통과한 적 없다.
**이유 / fallback 철학과 구분**: 이건 "판단 불가 시 통과 가정(파싱 실패 fallback)"과 **결이 다른 타협**이다 — 여기선 verify가 명시적으로 False를 3번 줬다(판단은 됐다). 근거는 "버리는 것보다 부분 결과라도 보여주는 게 낫다"(CLAUDE.md의 "부분 실패는 정상적 결말"). 감춰지지 않는다 — retry 이벤트 2개가 "이 요약은 검증을 통과 못 했다"는 감사 기록으로 남고, `paper_done`의 abstract로 연구자가 직접 대조한다.
**열린 문제 (Task 6로 이월)**: sse-contract의 `paper_failed` 예시 사유(*"…초록만으로는 검증을 두 번 모두 통과하지 못했습니다"*)는 verify 실패가 `paper_failed`로 갈 여지도 남긴다. 반면 4-5 완료 기준은 `paper_done`이다. 이 경계(verify 소진 → `paper_done`인가 `paper_failed`인가)는 `_verify_loop` 밖의 라우팅 결정이라 **Task 6 #49("error vs paper_failed 구분")로 넘겼다.** `_verify_loop`은 값을 버리지 않고 반환하는 데까지만 책임진다.
> 🔄 변경 가능 정보 · 확인일: Task 4 진행 시점(2026-07-24) · Task 6 #49에서 확정 예정.
