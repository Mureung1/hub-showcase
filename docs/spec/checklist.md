# 개발 체크리스트

> 작업 분해와 진행 상황. **완료 기준(검증 방법)이 없는 항목은 체크하지 않는다.**
> "다 한 것 같다"가 아니라 "이 명령을 쳤더니 이게 나왔다"가 완료다.
>
> **참고** — 무엇을 왜: [../plan.md](../plan.md) · 인터페이스: [sse-contract.md](sse-contract.md) · 규칙: [../../CLAUDE.md](../../CLAUDE.md)

**챌린지 기간:** 2026-07-06(월) ~ 07-31(금) · 데모데이 07-31 (네이버 1784, 오프라인)
**대응:** 각 주차는 [plan.md §10](../plan.md)의 번호와 연결된다.

---

## Week 0 — 준비 (~07/05)

챌린지 시작 전. 문서와 환경을 정리해 **7/6에 바로 코드부터 칠 수 있게** 만든다.

> **📍 진행 점검** — `main`에서 새 브랜치 `agent-service`를 분기해 v1(정적 MVP)과 분리 진행. v1은 `work` 브랜치 + 태그 `v1-static-mvp`에 보존.

- [x] `docs/plan.md`를 v2 내용으로 교체
  - **완료 기준:** 문서에 "정적", "cron", "매일 자동"이 남아 있지 않다 — ✓ `docs/plan.md`는 §8에서 정적+cron 방식을 **거부 근거**로만 언급(잔재 아님). 원본과 byte-identical 확인
- [x] `docs/spec/mvp-plan.md` · `docs/user-scenarios.md` v1 잔재 정리 (갱신 또는 삭제)
  - **완료 기준:** `grep -ri "정적\|cron\|GitHub Pages" docs/` 결과에 앱 배포 관련 언급이 없다 — ✓ `agent-service` 브랜치는 `main`(v1 없음)에서 분기해 애초에 두 파일이 존재하지 않음. grep 결과는 plan.md §8(거부 근거)·checklist 자기 설명뿐
- [x] `docs/spec/sse-contract.md` 배치 — ✓ 원본과 byte-identical
- [x] `prompts/` 5개 파일 + `CHANGELOG.md` 배치 — ✓ judge·select_tool·summarize·verify·trend·CHANGELOG 6파일 생성, 상호 참조(`./CHANGELOG.md` 등) 전부 유효
- [x] 디렉토리 구조 생성 (`app/` `prompts/` `web/` `data/` `tests/`) — ✓ 5개 폴더 전부 존재 (`app/__init__.py`, 나머지 `.gitkeep`)
- [x] `.env.example` · `.gitignore`(`.env`, `data/` 포함) 작성 — ✓ 둘 다 존재, `.env` 차단·`data/*` 무시(`.gitkeep` 제외) 확인
- [x] Gemini API 키 발급 + `.env` 설정 — ✓ 2026-07-26 해결. `GEMINI_MODEL="gemini-2.0-flash"`의 무료 티어 quota가 3개 지표 전부 `limit:0`(계정 자체가 이 모델에 무료 할당량 없음 — 소진이 아니라 애초에 0)이라 실패했던 것 — `genai.list_models()`로 키 자체는 유효함을 먼저 확인한 뒤, `gemini-2.0-flash-lite`도 동일하게 `limit:0`, `gemini-flash-lite-latest`·`gemini-flash-latest`는 정상 응답하는 것을 개별 테스트로 확인. `config.py`의 `GEMINI_MODEL`을 `"gemini-flash-latest"`로 교체해 해결(CLAUDE.md의 "Gemini Flash" 스펙에 부합하는 별칭)
  - **완료 기준:** `python -c "..."` 한 줄로 LLM 호출이 성공한다 — ✓ `python -m app.tools --check llm` → `2` 응답 확인
- [x] `requirements.txt` (fastapi, uvicorn, arxiv, google-generativeai, pytest) — ✓ 명시 5종 전부 포함(+feedparser·python-dotenv·pypdf 추가)

> ⚠️ **발견된 이슈 (경로 불일치)** — 루트 `CLAUDE.md` 내부 링크(`../docs/...`, `../prompts/CHANGELOG.md` 등)가 **한 단계 중첩된 위치**(예: `.claude/CLAUDE.md`)를 전제로 쓰여 있어, 지금처럼 **루트 배치 시 전부 깨짐**(`../docs/plan.md` → repo 밖). 반면 `plan.md`·`checklist.md`는 CLAUDE.md를 **루트**로 전제(`../CLAUDE.md`, `../../CLAUDE.md`)해 서로 상충. plan.md·checklist.md 쪽(2곳)이 다수이므로 **CLAUDE.md 내부 링크에서 `../`를 한 겹 제거**하는 쪽이 맞다. 별도 수정 필요.

---

## Week 1 — 에이전트가 터미널에서 돈다 (07/06~07/12)

**목표: [plan.md §10](../plan.md) 1번.** 웹은 손대지 않는다.

> **📍 진행 점검 (2026-07-26)** — Task 0~6(#1~#50, PR #51~#57 전부 병합)으로 완주. `GEMINI_MODEL`을 `gemini-flash-latest`로 교체해 무료 티어 quota 문제를 해결했고, `python -m app.agent --topic "LLM agent planning" --limit 3`를 실제 API로 끝까지 돌려 이 주차 목표(single-agent 루프)를 완전히 검증했다. 그 과정에서 `search_arxiv()`가 다단어 topic을 따옴표 없이 `all:`에 넣어 검색이 사실상 무의미해지던 **실제 버그도 발견해 같이 고쳤다**(`app/tools.py`, 아래 참고).

### 도구 (개발 순서 [1])
- [x] `app/config.py` — `MAX_RETRY = 2`, 환경변수 로드 — ✓ 2026-07-26 파일 확인: `MAX_RETRY=2`, `python-dotenv`로 `.env` 로드. `SUMMARIZE_PARSE_ATTEMPTS`·`DEFAULT_LIMIT`·`ARXIV_CATEGORIES`도 함께 관리
- [x] `app/tools.py :: search_arxiv()` — cs.CL/cs.AI/cs.LG 검색
  - **완료 기준:** `python -m app.tools --check arxiv --topic "LLM agent"` → 논문 목록 출력 — ✓ 2026-07-26 실행, 3편 출력 확인. **버그 발견·수정**: `all:{topic}`을 따옴표 없이 넣으면 arXiv 쿼리 파서가 `all:`을 첫 단어에만 적용해 다단어 topic(대부분의 실제 입력)에서 검색이 사실상 topic과 무관해짐 — 실제로 "retrieval augmented generation"·"large language model agents" 등으로 3번 연속 무관한 논문만 나온 것으로 발견. `all:"{topic}"`으로 감싸도록 수정 후 재검증(`GRADRAG`·`VizRAG` 등 실제 RAG 논문 출력 확인)
- [x] `app/tools.py :: ask_llm()` — Gemini Flash 호출. 교체 가능하게 추상화
  - **완료 기준:** `python -m app.tools --check llm` → 응답 출력 — ✓ 2026-07-26 모델을 `gemini-flash-latest`로 교체 후 실행, `2` 응답 확인(위 Week 0 Gemini 키 항목 참고)
- [x] `app/tools.py :: ask_llm_json()` — **fallback 포함.** ```json 래핑 벗기기
  - **완료 기준:** 일부러 깨진 응답을 넣어도 fallback이 반환되고 예외가 안 난다 — ✓ 2026-07-26 `ask_llm`을 깨진 응답으로 mock, 예외 없이 fallback 반환 확인
- [x] `app/tools.py :: fetch_fulltext()` — PDF 본문 추출
  - **완료 기준:** 실패해도 예외 대신 `None`을 반환한다 — ✓ 존재하지 않는 도메인으로 호출, 예외 없이 `None` 반환 확인
- [x] `app/prompt_loader.py` — `prompts/*.md` 로드 — ✓ judge·select_tool·summarize·verify·trend 5개 파일 전부 로드 성공 확인

### 에이전트 5단계 (개발 순서 [2])
- [x] 1단계 판단 — `picked` + `excluded` **둘 다** 반환. 개수 검증(누락 index는 excluded로) — ✓ `agent._validate_coverage` 직접 호출, 누락 index가 "판단 누락" 사유로 excluded에 채워지는 것 확인. `_judge_papers`는 raw 응답이 완전히 비면(picked·excluded 둘 다 빈 경우) 판단 실패로 보고 `None` 반환(Task 6 #49에서 추가)
- [x] 2단계 도구 선택 — `need_fulltext` 판단 → 분기 — ✓ `agent._select_tool`이 파싱 실패 시 `need_fulltext=False`(비용이 덜 드는 쪽) fallback 확인
- [x] 3단계 요약 — `contribution`/`method`/`result` 3키 고정 — ✓ 3키는 `prompts/summarize.md` 프롬프트가 강제(judge/trend와 같은 패턴, 코드 차원 스키마 검증은 아님). 파싱 실패 시 `SUMMARIZE_PARSE_ATTEMPTS=3`회 재시도 후 `None` 반환 확인
- [x] 4단계 자기 검증 — 실패 시 3단계로. **`MAX_RETRY = 2` 상한** — ✓ `tests/test_verify.py` 4개 전부 통과 — `is_good` 통과/재시도·피드백 반영/`MAX_RETRY=2` 상한(3회째 attempt는 발생 안 하고 마지막 요약 채택) 확인
- [x] 5단계 트렌드 추론 — `flows[].papers` 근거 필수 — ✓ `tests/test_trend.py` 4개 전부 통과. `papers` 근거는 `prompts/trend.md`가 강제("근거를 못 대면 그 흐름은 버려라"), 코드는 fallback `{"flows":[],"gap":None}`로 판단 불가 시 억지 흐름 생성을 막는다
- [x] `run_agent()`를 **제너레이터로** 조립. `sse-contract.md`의 stage를 그대로 yield — ✓ Task 6(#46~#50, PR #57 2026-07-26 병합)로 구현. mock 기반 `tests/test_orchestration.py`(전체 pytest 18개 중 10개)로 이벤트 순서 전부 증명한 데 더해, **quota·검색 버그를 고친 뒤 실제 API로 전체 파이프라인을 끝까지 실행해 재검증**(아래 완료 기준 참고)
  - **완료 기준:** `python -m app.agent --topic "LLM agent planning" --limit 3`
    → search·found·judge·read·paper_done·trend·done이 순서대로 print된다 — ✓ 2026-07-26 실제 API로 실행, `search→found→judge(3편 선택)→read→paper_done→read→paper_done→read→paper_failed→trend→done` 순서로 정확히 출력됨(3편 중 1편은 요약 반복 실패로 `paper_failed` — 부분 실패도 정상적으로 동시에 실증됨). `done.stats == {"scanned":3,"selected":3,"succeeded":2,"failed":1,"llm_calls":12}`로 `succeeded+failed==selected` 불변식도 실전에서 성립 확인

> **이번 주 안에 반드시 겪어야 하는 것:** `retry`가 실제로 한 번은 발동하는 것.
> 한 번도 안 나오면 4단계 프롬프트가 너무 관대한 것이다. `prompts/verify.md`를 조인다.
> — ✓ `tests/test_verify.py::test_verify_loop_emits_retry_and_resummarizes_on_bad`,
> `tests/test_orchestration.py::test_run_agent_includes_retry_events_between_read_and_paper_done`에서
> mock으로 재현·확인됨. 실제 API로 자연 발생하는 것은 quota 소진으로 아직 미관찰.

---

## Week 2 — 웹에서 돌고, 과정이 흐른다 (07/13~07/19)

**목표: [plan.md §10](../plan.md) 2·3번.** 화면은 아직 안 만든다.

### 서버 (개발 순서 [3])
- [x] `app/main.py` — `GET /api/brief/stream?topic=`. **POST 아님** (#59)
- [x] `run_agent()`의 yield를 `f"data: {json}\n\n"`로 감싸기 (`ensure_ascii=False`) (#60)
- [x] 헤더: `Cache-Control: no-cache`, **`X-Accel-Buffering: no`** (#59)
- [x] `request.is_disconnected()` 감지 → 즉시 중단 (#61)
- [x] 예외 → `error` 이벤트로 종결 (브라우저가 영원히 기다리지 않게) (#62)
  - **완료 기준:** `curl -N "http://localhost:8000/api/brief/stream?topic=LLM+agent"`
    → `data: {...}` 가 **하나씩 시차를 두고** 흘러나온다 (마지막에 몰려 나오면 실패)
  - **검증(2026-07-27):** `12:02:54 search → 12:04:51 found → 12:04:53 judge → … → 12:05:05 done`.
    마지막에 몰려 나오지 않음. 한글 미이스케이프, 각 `data:` 뒤 빈 줄 1개 확인

### 계약 검증
- [x] 실제 yield되는 이벤트가 `sse-contract.md`와 일치하는지 대조 (#63)
  - **완료 기준:** 계약에 없는 필드가 없고, 있는 필드가 빠지지 않았다
  - **검증(2026-07-27):** 실제 실행 캡처 9개 이벤트
    (`search→found→judge→read→paper_done→read→paper_done→trend→done`) 전부 일치.
    `error` 경로도 실제 캡처로 대조. `tests/test_sse_contract.py`가 계약을 코드로 옮겨
    `retry`·`paper_failed`·`empty`·`error` 분기까지 상시 검사한다

> **Week 2에서 발견해 이월한 것** (Task 7 범위 밖이라 이슈만 등록):
> #65 `agent.py` trend/done 조립부에 예외 보호가 없어 계약 위반 `error`가 나갈 수 있다 ·
> #66 `search_arxiv()`가 호출마다 새 `Client`를 만들어 arXiv 3초 제한(429)에 걸린다 ·
> #64 `tools.CALL_COUNT`가 프로세스 전역이라 동시 요청에서 섞인다

> **`curl -N`이 안 되는 상태에서 브라우저를 붙이지 않는다.** 원인 범위가 두 배가 된다.

---

## Week 3 — 화면이 산다 (07/20~07/26)

**목표: [plan.md §10](../plan.md) 4·5번.**

> Task 8(#68) · 브랜치 `redo/frontend` · 실제 작업일 2026-07-27

### 프론트 (개발 순서 [4] — 백엔드 없이)
- [x] `web/mock.js` — `sse-contract.md`의 목 데이터. **`retry`·`paper_failed` 포함** (#69)
  - 시나리오 **5종**: `normal` · `partial` · `barren` · `empty` · `error`
  - `barren`(판단 결과 0편 → 카드 없는 `done`)은 계약 예시에 없던 경로다. 실제 `agent.py`와
    대조하다 발견해 추가했고, 계약 문서화는 #79로 이월
- [x] `web/index.html` — 입력창 + 예시 주제 버튼 3~4개 + 빈 타임라인 (#70)
  - **완료 기준:** 처음 들어온 사람이 클릭 한 번으로 시작할 수 있다 → 예시 칩 4개, 클릭 시 입력창이 채워짐
  - 예시 주제는 영어. `search_arxiv()`가 `all:"{topic}"`으로 그대로 보내 한국어면 0편이 나온다
- [x] `web/app.js` — stage별 분기 → 타임라인에 DOM 추가 (#71)
- [x] `judge` 강조 블록 + **"제외된 N편 보기" 펼침** (#72)
- [x] `paper_done` 카드 — 3줄 요약 · **배지(본문/초록)** · 원문 초록 펼침 · arXiv 링크 (#73)
- [x] `retry` 앰버 로그 — 감추지 않는다 (#74)
- [x] `paper_failed` — **화면 대체 금지.** 타임라인 항목 + 원문 링크 (#74)
  - 실패 도착 시점에 앞선 카드 2장이 남아 있고 `data-state`가 `running`을 유지하는 것까지 확인
- [x] `empty` — 에러 아님. 중립 톤 + 제안 버튼 (#75)
  - 서버의 `suggestions`가 항상 빈 배열이라(#77) 비면 예시 주제로 대체한다
- [x] `error` — 화면 대체. `code` 작게 노출 (#75)
  - 단, **카드가 이미 그려진 뒤의 `error`는 화면을 대체하지 않는다**(#65 대비)
- [x] 종결 이벤트 3종에서 **`EventSource.close()`** (#75)
  - **완료 기준:** `?mock=1`로 정상·부분실패·결과없음·전체실패가 전부 그려진다 → 5종 전부 확인

### 실연결 (개발 순서 [5])
- [x] 목 재생 → `new EventSource(...)` 교체 (#76)
  - **완료 기준:** 실제 주제를 넣으면 화면에 결과가 쌓인다 → `limit=2`로 실제 논문 2편이 카드로 그려짐
  - `main.py`에 `web/` 정적 마운트(API 라우트 뒤). 같은 오리진이라 CORS 불필요
  - `onerror`에서 종결시킨다 — 없으면 서버가 죽었을 때 EventSource가 재연결하며 에이전트를 반복 실행한다

> **에러 화면을 마지막으로 미루지 않는다.** 부분 실패는 예외가 아니라 일상이다.
> → 목 데이터(#69)부터 4가지 결말을 전부 넣어, 예외 화면을 8-7까지 미루지 않았다.

**Week 3에서 발견해 이월한 것** — 체크만 하고 넘어가면 이월 사실이 사라진다.
- #77 `empty.suggestions`가 구현에서 항상 빈 배열 (계약이 약속한 제안이 실서비스에 없다)
- #78 `empty.scanned` 예시 값 `12`는 도달 불가 (항상 0)
- #79 판단 결과 0편(카드 없는 `done`) 경로가 계약에 미문서화 — 프론트는 `barren`으로 대응했으나
  `sse-contract.md`는 아직 이 경로를 설명하지 않는다

---

## Week 4 — 근거가 이어지고, 배포된다 (07/27~07/31)

**목표: [plan.md §10](../plan.md) 6번.** 7번은 여유가 있을 때만.

> Task 9(#82) · 브랜치 `redo/trend-view` · 실제 작업일 2026-07-29

- [x] 트렌드 블록 + **논문 칩** — 클릭 시 해당 카드로 스크롤 (#83 · #84)
  - **완료 기준:** 트렌드 주장 → 카드 → arXiv 원문이 클릭으로 끊기지 않고 이어진다
    → ✓ 칩 클릭 실측(실시간): `scrollY 0 → 303`, 카드가 뷰포트 중앙(`top=284`),
      `checkVisibility()=true`, `location.hash` 변화 없음(`preventDefault`),
      플래시는 클릭 직후 부여 → 2.2초 뒤 `animationend`로 자동 제거
  - 칩은 `<button>`이 아니라 `<a href="#paper-N">`이다 — 의미상 진짜 링크라,
    JS가 죽어도 이동은 살아 있고 스크린리더에도 "이동한다"가 전달된다
  - `gap`은 `null` 가능(계약)이라 없으면 그 항목만 빠진다. `flows`도 `gap`도 없으면
    **블록 자체를 만들지 않는다** — `agent.py`의 fallback이 `{"flows": [], "gap": None}`이라
    실제로 도달하는 경로이고, 제목만 남으면 에이전트가 고장난 것으로 읽힌다
- [x] 완료 헤더 고정 (검토/선별 수 · 소요시간 · LLM 호출 수) (#85)
  - **완료 기준:** 타임라인을 위로 스크롤해도 계속 보인다 → ✓ `scrollY=900`(카드 한가운데)에서도
    `headerTop=0` · `checkVisibility()=true`. `elapsed`는 초 단위 실수라 `2분 14초`로 변환해 표시
  - `done`에서만 띄운다. `empty`(선별 0편 포함)·`error`는 띄우지 않는다 —
    "0편 검토 · 0편 선별"은 의미가 없고 사용자는 고장난 것으로 읽는다
  - 타임라인 끝의 `브리핑 완료 · N/N편` 로그 줄은 **제거했다**(헤더와 중복).
    이제 타임라인은 트렌드 블록으로 끝난다. 과정 로그는 그대로 남는다
- [x] `stats.failed > 0`이면 "3/4편" 표시 (#85)
  - **검증:** `?mock=partial`(`failed: 1`) → 헤더 제목이 `브리핑 완료 · 3/4편`,
    `normal`(`failed: 0`) → `브리핑 완료`
- [x] **실연결 재검증** — `uvicorn app.main:app --port 8000`, `limit=2`
  - 브라우저에서 실제 주제로 끝까지 실행: `state=done`, 카드 2장,
    헤더 `2편 검토 · 2편 선별 · 11초 · LLM 호출 8회`, 트렌드 흐름 1개에 칩 2개
    (`#paper-1`·`#paper-2`), 타임라인 마지막 항목이 트렌드 블록
- [ ] 배포 (Render / Railway / HF Spaces)
  - **완료 기준:** 배포 URL에서 **실시간 스트리밍이 유지된다** (`X-Accel-Buffering` 확인)
- [ ] `README.md` — 데모 URL · 스크린샷 · 무엇이 다른가
- [ ] 데모데이 시연 시나리오 — **`judge`와 `retry`가 보이는 주제**로 리허설

**Week 4에서 발견해 이월한 것**
- #86 트렌드를 **못 만든 것**(LLM 파싱 실패 → fallback)과 **만들 게 없던 것**(성공 0편)이
  둘 다 `{"flows": [], "gap": null}`로 나가 구별되지 않는다. `paper_failed`는 전용 이벤트로
  보여주면서 트렌드 실패만 조용히 사라지는 비대칭 — 계약 변경이 필요해 Task 9 범위 밖
- #87 `mock.js`의 `partial`이 "카드 없는 index"를 만들지 못해(실패는 index 3, `papers`는 `[1,4]`·`[2]`)
  트렌드 칩의 방어 코드가 목으로는 한 번도 검사되지 않는다. 9-2 검증은 스크래치패드 사본으로 확인

### 여유가 있으면 ([plan.md §10](../plan.md) 7번)
- [ ] multi-agent — 판단·요약·검증을 독립 에이전트로 분리, 메시지 교환
  - **착수 조건:** 1~6번이 배포 상태에서 안정적으로 동작

---

## 끊어내기 규칙

일정이 밀릴 때 **무엇을 버릴지 미리 정해둔다.** 그래야 마지막 주에 흔들리지 않는다.

| 시점 | 신호 | 버리는 것 |
|---|---|---|
| **07/12** | 에이전트가 터미널에서 안 돌면 | 5단계(트렌드)를 빼고 4단계까지만. 트렌드 없이도 개별 요약은 가치가 있다 |
| **07/19** | `curl -N`이 안 되면 | SSE를 포기하고 동기 방식으로. `run_agent()`를 for로 소진해 마지막 결과만 반환 |
| **07/26** | 화면이 안 그려지면 | `gap`(트렌드 3번 항목), 완료 헤더 통계, 원문 초록 펼침 |
| **07/29** | 배포가 안 되면 | 로컬 시연으로 전환. 배포보다 **동작하는 데모**가 우선 |

**절대 버리지 않는 것:** `judge`의 제외 사유, `retry` 로그, 카드 배지.
이 셋이 없으면 이 프로젝트는 그냥 요약 사이트다. ([plan.md §3](../plan.md))

---

## 상시 점검

- [ ] 개발 중 `--limit 3` 이하로 돌리고 있는가 (무료 티어 한도)
- [ ] 프롬프트를 고칠 때마다 `prompts/CHANGELOG.md`에 **무엇을·왜·결과**를 남겼는가
- [ ] `sse-contract.md`를 **코드보다 먼저** 고쳤는가
- [ ] `.env`가 커밋되지 않았는가
