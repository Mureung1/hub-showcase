# CLAUDE.md

이 파일은 Claude Code가 이 저장소(hub)에서 개발할 때 따르는 지침이다.
**결정된 것만 적는다. 논의 중인 것은 여기 적지 않는다.**
프로젝트 배경·기획은 여기 담지 않고 [docs/](docs/)로 링크한다(맨 아래 참고 문서).

## 프로젝트 개요

**hub** — arXiv 논문을 **스스로 판단해서** 골라 읽고 요약하는 LLM 에이전트 **웹 서비스**.
사용자가 주제를 입력하면 에이전트가 그 자리에서 작동하고, 진행 과정이 실시간(SSE)으로 화면에 흐른다.

**타겟은 AI 연구자·개발자다.** 이 사실이 대부분의 설계 결정을 지배한다.
연구자는 검증할 수 없는 것을 믿지 않는다. 그래서 에이전트의 판단 과정은 장식이 아니라 **신뢰의 근거**다.

---

## 절대 금지 — 위반 시 코드를 되돌린다

이 항목들은 이미 논의가 끝났다. 다시 제안하지 말 것.

| 금지 | 이유 |
|---|---|
| **React·Vue·Next.js 등 프론트 프레임워크** | plain HTML + JS로 충분. 4주 프로젝트에서 빌드 설정·상태관리를 배우는 건 낭비 |
| **DB (Postgres·SQLite·MongoDB)** | JSON 파일이면 충분. 로그인·다중사용자 없음 |
| **로그인·인증·사용자 계정** | 공개 페이지. 기획에서 명시적으로 제외됨 |
| **프롬프트를 .py 파일에 문자열로 박기** | 프롬프트는 이 프로젝트의 사실상 소스코드. `prompts/`에서 관리하고 코드는 로드만 |
| **SSE 엔드포인트를 POST로** | 브라우저 EventSource는 GET만 지원. 반드시 GET + 쿼리스트링 |
| **완료 시 진행 로그 제거·초기화** | 로그는 감사 기록이다. 완료 후에도 남는다 |
| **에러 발생 시 화면 전체를 에러로 대체** | 실패는 사건이지 상태가 아니다. 아무것도 못 건진 경우에만 화면 대체 |
| **GitHub Pages에 앱 배포 / cron 배치 파이프라인** | 정적 호스팅으로는 백엔드를 못 띄운다. 이 서비스는 요청 순간 실행된다 ([docs/plan.md](docs/plan.md) §8) |

> `docs/` 문서를 GitHub Pages로 서빙하는 것은 무관하다. 금지 대상은 **앱 본체**의 정적 배포다.

---

## multi-agent — 목표이지만 순서가 있다

**금지가 아니다.** 이 프로젝트의 정식 목표다 ([docs/plan.md](docs/plan.md) §10 7번).
다만 **§10 1~6번(single-agent 루프 + 웹 + 근거 표시)이 완주되기 전에는 시작하지 않는다.**
multi-agent는 single-agent 여러 개가 메시지를 주고받는 구조라, 5단계가 각각 안정적으로 도는 것이 전제 조건이다.

---

## 기술 스택

- **백엔드**: Python 3.11, FastAPI. 패키지 관리 `pip`.
  - 수집: `arxiv` / `feedparser`, 본문: PDF 파서
  - LLM: **Gemini Flash(무료 티어)**. 한도 초과 시 Claude Haiku / Ollama로 교체 가능하도록 `tools.ask_llm()` 뒤에 추상화
- **스트리밍**: **SSE(Server-Sent Events)**. WebSocket 아님, 폴링 아님.
- **프론트엔드**: 순수 정적(바닐라 HTML/CSS/JS, **빌드 없음**). `EventSource`로 SSE 수신 → 타임라인에 DOM 추가.
- **저장**: JSON 파일 (`data/`). DB 없음.
- **배포**: Render / Railway / Hugging Face Spaces 중 택1. **상시 서버 필요.**

---

## 디렉토리 구조

```
hub/
├── app/                    # 백엔드 (Python 패키지)
│   ├── __init__.py
│   ├── main.py             # FastAPI. run_agent()의 yield를 SSE로 감싸기만 한다. 로직 없음.
│   ├── agent.py            # 에이전트 루프. run_agent()는 반드시 제너레이터. 5단계.
│   ├── tools.py            # search_arxiv / fetch_fulltext / ask_llm / ask_llm_json
│   ├── prompt_loader.py    # prompts/*.md 로드. 코드에 프롬프트를 박지 않기 위한 유일한 통로.
│   └── config.py           # 환경변수·상수 (MAX_RETRY 등)
│
├── prompts/                # 에이전트 판단 로직 (사실상 소스코드)
│   ├── judge.md            # 1단계 · 판단
│   ├── select_tool.md      # 2단계 · 도구 선택
│   ├── summarize.md        # 3단계 · 요약
│   ├── verify.md           # 4단계 · 자기 검증
│   ├── trend.md            # 5단계 · 트렌드 추론
│   └── CHANGELOG.md        # 프롬프트 변경 기록 (무엇을·왜·결과)
│
├── web/                    # 프론트 (정적)
│   ├── index.html
│   ├── app.js              # EventSource 수신 → 타임라인 렌더
│   ├── mock.js             # 목 이벤트 재생. 백엔드 없이 프론트 완성용.
│   └── style.css
│
├── data/                   # 실행 결과 JSON (gitignore)
├── docs/                   # 기획·명세 정본
│   ├── plan.md
│   └── spec/
│       ├── sse-contract.md
│       ├── checklist.md
│       └── wireframes/
├── tests/
├── .github/workflows/      # CI(테스트)용. 앱 배포용 cron 아님.
├── .env.example
└── requirements.txt
```

**의존 방향은 한 방향이다.** `main.py → agent.py → tools.py → prompt_loader.py`
`tools.py`는 에이전트를 모른다. `agent.py`는 웹을 모른다. **역방향 import 금지.**
이 규칙 덕분에 웹 없이 에이전트를 터미널에서 완성할 수 있다.

**`prompts/`가 `docs/`가 아닌 이유:** 문서가 아니라 런타임에 로드되는 자산이다.
문서와 섞으면 "고쳐도 되는 글"로 취급되어 코드와 어긋난다.

새 파일은 역할에 맞는 폴더에 만든다. (에이전트 로직 → `app/`, 프롬프트 → `prompts/`, 화면 → `web/`)

---

## 개발 순서와 명령어

**웹은 마지막에 붙인다.** 에이전트와 웹을 동시에 만들면 오류가 나도 어디가 원인인지 모른다.
순서를 건너뛰지 않는다.

```bash
# 의존성
pip install -r requirements.txt

# [1] tools.py 각 함수를 개별 검증 — 웹 없이, 에이전트 없이
python -m app.tools --check arxiv --topic "LLM agent planning"
python -m app.tools --check llm

# [2] run_agent()를 터미널에서 돌려 print로 5단계 검증 — 웹 없이
python -m app.agent --topic "LLM agent planning" --limit 3
#     └ --limit 3: 개발 중엔 논문 수를 줄인다. 무료 티어 한도가 금방 찬다.

# [3] FastAPI 붙이고 SSE 확인 — 브라우저 없이
uvicorn app.main:app --reload --port 8000
curl -N "http://localhost:8000/api/brief/stream?topic=LLM+agent+planning"
#     └ -N: 버퍼링 끄기. 없으면 실시간인지 확인할 수 없다.
#       data: {...} 가 하나씩 흘러나오면 서버 측 성공.

# [4] 프론트를 mock.js로 먼저 완성 — 백엔드 없이
python -m http.server 8001   # → http://localhost:8001/web/?mock=1

# [5] 목 이벤트를 EventSource로 교체 → http://localhost:8000

# 테스트
pytest
```

---

## 코드 규칙 (아키텍처 불변식)

**`run_agent()`는 반드시 제너레이터다.** 결과를 모아서 return하지 말 것.
이것 때문에 동기 방식 ↔ SSE 방식을 에이전트 코드 수정 없이 바꿀 수 있다. **이 설계를 깨지 말 것.**

**LLM 응답 파싱은 항상 실패를 가정한다.** `ask_llm_json(prompt, fallback)`을 쓴다.
LLM은 반드시 JSON 형식을 어긴다 (```json으로 감싸기, 앞뒤 설명 붙이기). `json.loads()`를 try 없이 쓰지 말 것.
파싱 실패 시 fallback으로 넘어가고 에이전트는 죽지 않는다.

**fallback은 "비용이 덜 드는 쪽"으로 정한다.** 2단계는 `need_fulltext: false`, 4단계는 `is_good: true`.
판단 불가 시 본문을 받거나 재시도하면 돈과 시간이 샌다.

**재시도에는 항상 상한이 있다.** `MAX_RETRY = 2` (`config.py`). 없으면 무한 루프로 API 비용이 탄다.

**SSE 응답 규칙 두 가지.** 하나라도 빠지면 실시간이 아니다.
- 메시지는 `f"data: {json}\n\n"`. **빈 줄 하나 빠뜨리면 브라우저가 인식하지 못한다.**
- 헤더에 `X-Accel-Buffering: no`. **없으면 로컬은 되고 배포하면 실시간이 사라진다** (프록시가 응답을 모아뒀다 한 번에 보냄).

**에이전트의 "판단"은 마법이 아니다.** 전부 다음 패턴이다:
LLM에게 묻기 → JSON으로 받기 → 코드가 `if`로 분기. **새로운 추상화를 발명하지 말 것.**

**`docs/spec/sse-contract.md`는 코드보다 먼저 고친다.** 계약이 코드보다 뒤처지면 AI가 잘못된 명세를 믿고 프론트를 짠다.

---

## 코드 컨벤션

- **주석·docstring은 한국어**로 작성.
- **PEP8** 준수, **타입힌트** 사용.
- 포맷터/린터는 **ruff / black 권장**(강제는 아님). 커밋 전 정리 권장.
- 함수·변수는 명확한 이름으로. 매직넘버 지양 → `config.py`로.
- **프론트도 동일**: 빌드 없음. 전역 오염 피하고, DOM 조작은 `app.js`에 모은다.

---

## 비밀·외부 API 규칙

- **API 키를 코드에 하드코딩하지 않는다. (절대 금지)**
- 로컬은 `.env`(반드시 `.gitignore`에 포함), CI/배포는 **GitHub Secrets / 호스팅 환경변수**로 주입.
- `.env`·키 파일을 커밋/푸시하지 않는다. `.env.example`만 커밋한다.
- **Gemini / arXiv 무료 티어 호출 한도를 고려한다.**
  - 논문 1편당 LLM을 4회 이상 호출한다(판단·도구선택·요약·검증). 4편이면 20회+.
  - **개발 중엔 항상 `--limit 3` 이하로 돌린다.** 습관적으로 전체를 돌리면 하루 한도가 오전에 찬다.
  - 재시도·백오프 처리. `rate_limit_exceeded`는 예외가 아니라 일상이다.

---

## Git 워크플로 & 커밋 컨벤션

- **커밋·푸시는 사용자가 요청할 때만** 수행한다. (임의로 커밋하지 않음)
- 개발은 `work` 브랜치에서, 안정되면 `main`에 병합.
- 커밋 메시지 끝에 다음 트레일러를 붙인다:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

### 커밋 타입
`Feat`(기능) · `Build`(빌드) · `Chore`(자잘한 수정) · `Ci`(CI 설정) · `Docs`(문서) · `Form`(형식·정렬·주석) · `Style`(스타일·포맷) · `Test`(테스트) · `Release`(릴리즈) · `Init`(첫 커밋)

> **프롬프트 수정은 `Feat`으로 다룬다. `Docs`가 아니다.**
> `prompts/*.md`는 문서가 아니라 에이전트의 동작을 바꾸는 코드다.

### 커밋 구조
```
<type>(<scope>): <subject>   -- 제목
                             -- 공백 라인
<body>                       -- 본문
                             -- 공백 라인
<footer>                     -- 꼬리말
```

---

## 도메인 용어

| 용어 | 뜻 |
|---|---|
| **판단 (judge)** | 수집한 논문 중 무엇이 중요한지 에이전트가 고르는 1단계. **제외 사유도 결과물이다.** |
| **도구 선택 (select_tool)** | "초록으로 충분한가, 본문까지 필요한가"를 판단하는 2단계 |
| **자기 검증 (verify / Reflexion)** | 생성한 요약을 스스로 평가하고 부실하면 3단계로 되돌리는 4단계 |
| **트렌드 추론 (trend)** | 논문들 사이의 연결점을 찾는 5단계 |
| **부분 실패** | 4편 중 3편만 성공한 상태. **에러가 아니라 정상적인 결말** |
| **결과 없음** | 검색은 성공, 관련 논문 0편. **에러가 아니다** |

> 부분 실패 · 결과 없음 · 전체 실패는 **전부 다르게 처리한다.** 하나로 뭉뚱그리지 말 것.

---

## UI 규칙

**단일 세로 타임라인.** 좌우 분할 금지, 챗봇 UI 금지.
과정 로그와 결과 카드가 시간순으로 한 줄에 쌓인다.

**위계는 레이아웃이 아니라 스타일로 만든다.** 과정 로그는 작고 흐리게, 결과 카드는 크고 선명하게.

**요약은 고정된 3줄이다.** `기여 · 방법 · 결과`. 자유 문단 금지.
여러 논문을 세로로 훑을 때 같은 위치에 같은 정보가 있어야 눈으로 비교된다.

**반드시 있어야 하는 것:**
- "제외된 N편 보기" — 제외 사유 포함. 없으면 "놓치지 않기"라는 가치가 증명되지 않는다
- 카드 배지 — "본문까지 읽음" / "초록으로 충분". 도구 선택이 눈에 보이는 유일한 지점
- 재시도 로그 — 스스로 점검했다는 증거. 감추지 말 것
- 트렌드의 논문 칩 — 클릭하면 위 카드로 이동. 주장에는 근거가 붙어야 한다

**`done` / `error` / `empty` 수신 시 반드시 `EventSource.close()`.**
안 하면 자동 재연결이 일어나고 → 에이전트가 통째로 재실행되고 → API 비용이 탄다.

---

## 참고 문서

| 문서 | 내용 |
|------|------|
| [docs/plan.md](docs/plan.md) | 전체 기획서 — 무엇을 왜 만드는가 |
| [docs/spec/sse-contract.md](docs/spec/sse-contract.md) | **SSE 이벤트 계약. 백엔드↔프론트의 유일한 인터페이스** |
| [prompts/CHANGELOG.md](prompts/CHANGELOG.md) | 프롬프트 변경 기록 (무엇을·왜·결과) |
| [docs/spec/checklist.md](docs/spec/checklist.md) | 작업 분해 체크리스트 |
| [docs/spec/wireframes/](docs/spec/wireframes/) | 화면 와이어프레임 (진입·작업중·완료·에러) |
