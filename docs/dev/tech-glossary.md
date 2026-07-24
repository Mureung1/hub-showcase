# 기술 개념 정리 — hub 프로젝트 (Task 0)

> 목적: 개인 학습 참고용. Task 0(도구 준비) 동안 코드를 이해하며 물어본 개념을 카테고리별로 정리한다.
> Task 1(판단/judge)은 별도 문서 [`tech-glossary-judge.md`](./tech-glossary-judge.md)로 정리한다.
> 관통 사례: hub 프로젝트 (`app/config.py`, `app/tools.py`, `app/prompt_loader.py`)
> 형식: `docs/dev/task-planning-devide.md`, `docs/dev/pr-conflict-postmortem.md`와 같은 위치·성격의 문서.
> 각 항목은 등장한 순서(Sub 0-1 → 0-5)대로 배치했다 — 그때 무슨 순서로 막혔는지가 나중에 복기하기 더 잘 읽힌다.

---

## 개발/데이터

소프트웨어 제작(언어 메커니즘·라이브러리 사용법·설계 판단) 관련 개념.

### python-dotenv / load_dotenv()
**정의**: `.env` 파일의 `KEY=VALUE` 줄을 읽어 프로세스의 환경변수 테이블(`os.environ`)에 주입하는 서드파티 라이브러리·함수.
**hub에서는**: `app/config.py` 최상단에서 `load_dotenv()`를 호출한 뒤 `os.getenv("GEMINI_API_KEY")`로 읽는다.
**선택**: 모듈 최상위 레벨(함수 밖)에서 import 시점에 1회만 호출.
**이유 / 기각한 대안**: 모듈은 `sys.modules`에 캐싱되어 한 프로세스 안에서 최초 1회만 실행되므로, 함수마다 다시 부를 필요가 없다. 실제 배포 환경(Render·Docker 등)은 `.env` 파일 없이 플랫폼이 환경변수를 직접 주입하는데, `load_dotenv()`는 파일이 없으면 조용히 아무 것도 안 하고 넘어가므로 로컬·배포 양쪽에서 코드 변경 없이 동일하게 동작한다.
**관련**: [[os.getenv / os.environ]], [[호스팅 환경변수 주입]]

### os.getenv / os.environ
**정의**: `os.environ`은 프로세스 환경변수를 담은 dict와 유사한 객체(`os._Environ`, 딕셔너리 그 자체는 아님). `os.getenv(key, default)`는 거기서 값을 조회하되, 없어도 `KeyError` 대신 `default`를 반환하는 안전한 조회 함수.
**hub에서는**: `GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")`로 읽어 모듈 레벨 상수로 노출.
**관련**: [[python-dotenv / load_dotenv()]]

### 모듈-객체 관계 / import 메커니즘
**정의**: 파이썬은 모듈도 `module` 타입의 객체라서 속성 접근에 점(`.`)을 쓸 수 있다. `import`는 해당 파일을 최초 1회 위에서 아래로 실행하고 결과를 `sys.modules`에 캐싱하며, 이후 같은 모듈을 다시 `import`하면 캐시를 재사용할 뿐 파일을 다시 실행하지 않는다.
**hub에서는**: `config.MAX_RETRY`, `config.GEMINI_MODEL`처럼 `config` 모듈을 마치 객체처럼 점 접근한다.
**선택**: (결정이 아니라 정정 사례) "tools.py를 import만 해도 매번 arXiv 요청이 실행된다"는 초기 설명은 부정확했다.
**이유 / 기각한 대안**: 함수 **정의**는 import 시 실행되지 않는다 — 모듈 최상위 레벨에 있는 **호출문**(예: `data = search_arxiv("x")`가 `def` 밖에 그대로 적혀 있는 경우)만 즉시 실행된다. `if __name__ == "__main__":` 가드는 바로 이런 실수(데모/테스트 호출을 모듈 최상위에 남겨두는 것)를 방지하는 장치다. 사용자가 "이 문장이 정확한 설명인지 파악 후 설명해"라고 직접 검증을 요구해서 재확인 후 정정했다.
**관련**: [[if __name__ == "__main__" / CLI]], [[네트워크 요청이 "언제" 실제로 발생하는가]]

### if __name__ == "__main__" / CLI
**정의**: 모듈이 직접 실행되면 `__name__`이 `"__main__"`이 되고, 다른 모듈에서 `import`되면 파일명이 되는 파이썬 특성을 이용해 "직접 실행될 때만" 돌 코드를 감싸는 관용구. CLI(Command Line Interface)는 터미널에서 인자를 받아 동작하는 실행 진입점.
**hub에서는**: `tools.py` 맨 아래 `--check arxiv`/`--check llm`으로, 웹이나 에이전트 없이 개별 함수를 터미널에서 검증하는 최소 CLI로 사용.

### arxiv 패키지 (Search / Client)
**정의**: 서드파티 `arxiv` 패키지. `Search`는 검색 조건(쿼리·정렬 등)만 담는 값 객체이고, `Client`가 실제 HTTP 요청을 수행하는 실행 객체다 — `client.results(search)` 호출 시점에 `search._url_args()`로 조건을 URL로 직렬화해 요청을 보낸다.
**hub에서는**: `search_arxiv()`에서 `arxiv.Search(query=..., sort_by=SubmittedDate, sort_order=Descending)`으로 조건을 만들고, `arxiv.Client(page_size=limit, delay_seconds=3.0, num_retries=3).results(search)`로 실제 호출한다.
**선택**: 카테고리는 OR로 묶고 자유 텍스트(topic)는 AND로 연결하는 쿼리 문자열 — `(cat:cs.CL OR cat:cs.AI OR cat:cs.LG) AND all:{topic}`. 최신순(SubmittedDate, Descending) 정렬.
**이유 / 기각한 대안**: "세 카테고리 중 하나만 맞아도 되지만, topic 키워드는 반드시 포함"이라는 검색 의도에 맞춘 것. 카테고리까지 AND로 묶으면 한 논문이 세 카테고리 모두에 속해야 해서 결과가 지나치게 좁아진다.
**관련**: [[arXiv API 인증/한도]], [[파이썬 객체 종류]]

### 파이썬 객체 종류
**정의**: 파이썬은 "모든 것이 객체"다 — 모듈, 함수, 클래스, 인스턴스, `int`/`str` 리터럴까지 전부 `type()`으로 같은 방식으로 다룰 수 있다.
**hub에서는**: `config` 모듈, `search_arxiv` 함수, `arxiv.Search` 인스턴스가 전부 같은 객체 모델 위에서 동작한다는 배경 지식으로 사용 — 왜 모듈에도 `.`을 쓸 수 있는지에 대한 답.

### io.BytesIO + PdfReader
**정의**: `io.BytesIO`는 `bytes`를 파일처럼(`.read()`/`.seek()` 가능하게) 메모리 위에서 감싸는 클래스. `pypdf.PdfReader`는 "파일처럼 동작하는 무언가"를 받아 PDF를 파싱하는 클래스.
**hub에서는**: `fetch_fulltext()`에서 `urllib.request.urlopen(pdf_url).read()`로 받은 PDF `bytes`를 디스크에 쓰지 않고 `io.BytesIO(data)`로 감싸 바로 `PdfReader`에 전달.
**선택**: 임시 파일로 디스크에 쓰지 않고 메모리에서 바로 처리.
**이유 / 기각한 대안**: 덕 타이핑(duck typing) — `PdfReader`는 진짜 파일 객체인지 여부를 신경 쓰지 않고 `.read()`가 되기만 하면 동작한다. 디스크 I/O와 임시파일 정리 부담을 없앨 수 있다.

### google-generativeai (GenerativeModel)
**정의**: Gemini API의 (구) 파이썬 SDK. `GenerativeModel(model_name)`은 모델 이름만 들고 있는 가벼운 값 객체로, 생성 시점엔 네트워크 요청이 없다. 실제 요청은 `.generate_content(prompt)` 호출 시점에 발생한다.
**hub에서는**: `ask_llm()`이 호출마다 `genai.configure(api_key=...)` → `GenerativeModel(config.GEMINI_MODEL)` → `generate_content(prompt)` 순서로 수행.
> 🔄 변경 가능 정보 · 확인일: 이번 세션(2026-07-23 전후) · 출처: 패키지 import 시 출력되는 `FutureWarning` — `google-generativeai`는 deprecated고 공식 후속은 `google.genai`. 이 프로젝트는 여전히 전자를 사용 중이므로 나중에 마이그레이션 여부를 확인해야 한다.
**관련**: [[네트워크 요청이 "언제" 실제로 발생하는가]]

### ask_llm() / ask_llm_json() 설계
**정의**: `ask_llm()`은 Gemini 호출을 감싸는 순수 추상화(문자열 → 문자열). `ask_llm_json()`은 그 위에 "응답을 JSON으로 파싱 시도 + 실패 시 fallback"이라는 방어 로직을 얹은 상위 함수.
**hub에서는**: judge·select_tool·summarize·verify·trend 5단계가 전부 `ask_llm_json()`만 호출한다 — LLM이 JSON 형식을 어기는 문제를 각 단계가 따로 처리하지 않는다.
**선택**: JSON 파싱 방어 로직을 개별 프롬프트/단계가 아니라 `tools.py`의 공용 함수 하나에 모음.
**이유 / 기각한 대안**: 5단계가 각자 방어 코드를 중복 작성하면 실패 처리 방식이 흩어져 일관성이 깨진다. `CLAUDE.md`가 "LLM은 반드시 JSON 형식을 어긴다"를 프로젝트 전제로 명시하므로, 이 전제를 한 곳에서만 다루는 게 유지보수에 유리하다.
**관련**: [[str.format() vs 단순 치환]]

### str.format() vs 단순 치환 (코드펜스 정규식 이슈 포함)
**정의**: `str.format()`은 문자열 안의 모든 중괄호 `{}`를 자리표시자로 해석하려 시도한다. 단순 치환(`.replace("{key}", value)`)은 정확히 일치하는 부분 문자열만 바꾼다.
**hub에서는**: `prompt_loader.fill()`이 `str.format()` 대신 `.replace()` 기반 단순 치환을 쓴다 — 프롬프트 안 JSON 예시(`{"picked":[...]}`)의 중괄호까지 자리표시자로 오인되는 걸 피하기 위함. 같은 맥락에서 `ask_llm_json()`의 코드펜스 벗기기도 처음엔 `text.startswith("```")`로 "펜스가 맨 앞에 있을 때만" 처리했다가, mock 테스트에서 "설명 텍스트 + 펜스"가 섞인 응답을 못 벗기는 걸 발견했다.
**선택**: `startswith` 체크 대신 `re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)`로 교체 — 문자열 어디에 있든 펜스 블록을 찾아 벗긴다.
**이유 / 기각한 대안**: `CLAUDE.md`가 명시한 두 실패 유형(코드펜스로 감싸기, 앞뒤 설명 붙이기) 중 후자를 원래 코드가 놓치고 있었다. 변경 범위가 한 줄로 작고, 무료 티어라 호출 낭비를 줄이는 게 더 중요하다고 판단해 채택. "현행 유지 + 스코프 밖으로 미루기" 대안은 이슈의 완료 기준 자체는 통과하지만, 프로젝트가 이미 경고한 실패 유형을 방치하는 셈이라 기각.
**관련**: [[ask_llm() / ask_llm_json() 설계]]

---

## 인프라/네트워크

시스템 구조·외부 API·배포 환경 관련 개념.

### 호스팅 환경변수 주입
**정의**: Render·Docker 같은 실제 배포 환경은 `.env` 파일 없이도 플랫폼 설정 화면이나 컨테이너 환경변수로 `GEMINI_API_KEY` 같은 값을 프로세스에 미리 주입해준다.
**hub에서는**: `config.py`가 `os.getenv()`로 값을 읽기만 하므로, 로컬(`.env` + `load_dotenv()`)과 배포(플랫폼이 주입) 양쪽에서 코드 변경 없이 동일하게 동작한다.
**관련**: [[python-dotenv / load_dotenv()]]

### 네트워크 요청이 "언제" 실제로 발생하는가
**정의**: 값 객체 생성(`arxiv.Search(...)`, `genai.GenerativeModel(...)`)과 실제 I/O 실행(`.results()`, `.generate_content()`)은 별개 시점이다 — 객체를 만드는 것만으로는 아무 네트워크 요청도 나가지 않는다.
**hub에서는**: 이 구분 덕분에 "tools.py를 import만 해도 요청이 나간다"는 초기 설명이 틀렸다는 게 드러났다 — 함수 정의는 코드일 뿐, 호출이 있어야 실제 I/O가 발생한다.
**관련**: [[모듈-객체 관계 / import 메커니즘]], [[google-generativeai (GenerativeModel)]]

### arXiv API 인증/한도
**정의**: arXiv API는 로그인·인증이 필요 없는 완전 공개 API. 요금은 무료지만, 명시적 rate limit 대신 "약 3초 간격을 지켜달라"는 관례적(courtesy) 제한이 있다.
**hub에서는**: `arxiv.Client(delay_seconds=3.0, num_retries=3)`로 이 관례를 지킨다. 그럼에도 개발 중 간헐적으로 429를 받은 전례가 있다.
> 🔄 변경 가능 정보 · 확인일: 2026-07-23 전후 세션 · 출처: `arxiv` 패키지 실 사용 경험 — 정책은 바뀔 수 있으므로 재확인 필요.
**관련**: [[arxiv 패키지 (Search / Client)]]

### Gemini 무료 티어 quota
**정의**: Gemini API 무료 티어는 프로젝트별로 요청 수·토큰 수 한도가 있고, 초과 시 `429 RESOURCE_EXHAUSTED`를 반환한다.
**hub에서는**: 이번 세션 중 실제로 이 프로젝트의 API 키가 연결된 Google 프로젝트가 `limit: 0` 상태라 라이브 `--check llm` 호출이 실패했다 — 코드 문제가 아니라 계정 설정 문제로 확인.
> 🔄 변경 가능 정보 · 확인일: Sub 0-4 검증 시점(2026-07-23 전후) · 출처: 실제 API 에러 응답 — 계정 설정이 바뀌면 달라진다.
**관련**: [[google-generativeai (GenerativeModel)]]

---

## 비즈니스/서비스

이번 세션(Task 0~1)엔 이 카테고리에 해당하는 질문이 없었다. MVP·플랫폼·SaaS 같은 기획·실무 용어에 대한 질문 없이, 전부 코드 동작 원리(개발/데이터)와 그 코드가 맞닿는 외부 시스템(인프라/네트워크)에 집중되어 있었다. Week 3(프론트) · Week 4(배포) 단계로 가면 이 카테고리가 채워질 가능성이 있다.
