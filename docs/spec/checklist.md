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

- [ ] `docs/plan.md`를 v2 내용으로 교체
  - **완료 기준:** 문서에 "정적", "cron", "매일 자동"이 남아 있지 않다
- [ ] `docs/spec/mvp-plan.md` · `docs/user-scenarios.md` v1 잔재 정리 (갱신 또는 삭제)
  - **완료 기준:** `grep -ri "정적\|cron\|GitHub Pages" docs/` 결과에 앱 배포 관련 언급이 없다
- [ ] `docs/spec/sse-contract.md` 배치
- [ ] `prompts/` 5개 파일 + `CHANGELOG.md` 배치
- [ ] 디렉토리 구조 생성 (`app/` `prompts/` `web/` `data/` `tests/`)
- [ ] `.env.example` · `.gitignore`(`.env`, `data/` 포함) 작성
- [ ] Gemini API 키 발급 + `.env` 설정
  - **완료 기준:** `python -c "..."` 한 줄로 LLM 호출이 성공한다
- [ ] `requirements.txt` (fastapi, uvicorn, arxiv, google-generativeai, pytest)

---

## Week 1 — 에이전트가 터미널에서 돈다 (07/06~07/12)

**목표: [plan.md §10](../plan.md) 1번.** 웹은 손대지 않는다.

### 도구 (개발 순서 [1])
- [ ] `app/config.py` — `MAX_RETRY = 2`, 환경변수 로드
- [ ] `app/tools.py :: search_arxiv()` — cs.CL/cs.AI/cs.LG 검색
  - **완료 기준:** `python -m app.tools --check arxiv --topic "LLM agent"` → 논문 목록 출력
- [ ] `app/tools.py :: ask_llm()` — Gemini Flash 호출. 교체 가능하게 추상화
  - **완료 기준:** `python -m app.tools --check llm` → 응답 출력
- [ ] `app/tools.py :: ask_llm_json()` — **fallback 포함.** ```json 래핑 벗기기
  - **완료 기준:** 일부러 깨진 응답을 넣어도 fallback이 반환되고 예외가 안 난다
- [ ] `app/tools.py :: fetch_fulltext()` — PDF 본문 추출
  - **완료 기준:** 실패해도 예외 대신 `None`을 반환한다
- [ ] `app/prompt_loader.py` — `prompts/*.md` 로드

### 에이전트 5단계 (개발 순서 [2])
- [ ] 1단계 판단 — `picked` + `excluded` **둘 다** 반환. 개수 검증(누락 index는 excluded로)
- [ ] 2단계 도구 선택 — `need_fulltext` 판단 → 분기
- [ ] 3단계 요약 — `contribution`/`method`/`result` 3키 고정
- [ ] 4단계 자기 검증 — 실패 시 3단계로. **`MAX_RETRY = 2` 상한**
- [ ] 5단계 트렌드 추론 — `flows[].papers` 근거 필수
- [ ] `run_agent()`를 **제너레이터로** 조립. `sse-contract.md`의 stage를 그대로 yield
  - **완료 기준:** `python -m app.agent --topic "LLM agent planning" --limit 3`
    → search·found·judge·read·paper_done·trend·done이 순서대로 print된다

> **이번 주 안에 반드시 겪어야 하는 것:** `retry`가 실제로 한 번은 발동하는 것.
> 한 번도 안 나오면 4단계 프롬프트가 너무 관대한 것이다. `prompts/verify.md`를 조인다.

---

## Week 2 — 웹에서 돌고, 과정이 흐른다 (07/13~07/19)

**목표: [plan.md §10](../plan.md) 2·3번.** 화면은 아직 안 만든다.

### 서버 (개발 순서 [3])
- [ ] `app/main.py` — `GET /api/brief/stream?topic=`. **POST 아님**
- [ ] `run_agent()`의 yield를 `f"data: {json}\n\n"`로 감싸기 (`ensure_ascii=False`)
- [ ] 헤더: `Cache-Control: no-cache`, **`X-Accel-Buffering: no`**
- [ ] `request.is_disconnected()` 감지 → 즉시 중단
- [ ] 예외 → `error` 이벤트로 종결 (브라우저가 영원히 기다리지 않게)
  - **완료 기준:** `curl -N "http://localhost:8000/api/brief/stream?topic=LLM+agent"`
    → `data: {...}` 가 **하나씩 시차를 두고** 흘러나온다 (마지막에 몰려 나오면 실패)

### 계약 검증
- [ ] 실제 yield되는 이벤트가 `sse-contract.md`와 일치하는지 대조
  - **완료 기준:** 계약에 없는 필드가 없고, 있는 필드가 빠지지 않았다

> **`curl -N`이 안 되는 상태에서 브라우저를 붙이지 않는다.** 원인 범위가 두 배가 된다.

---

## Week 3 — 화면이 산다 (07/20~07/26)

**목표: [plan.md §10](../plan.md) 4·5번.**

### 프론트 (개발 순서 [4] — 백엔드 없이)
- [ ] `web/mock.js` — `sse-contract.md`의 목 데이터. **`retry`·`paper_failed` 포함**
- [ ] `web/index.html` — 입력창 + 예시 주제 버튼 3~4개 + 빈 타임라인
  - **완료 기준:** 처음 들어온 사람이 클릭 한 번으로 시작할 수 있다
- [ ] `web/app.js` — stage별 분기 → 타임라인에 DOM 추가
- [ ] `judge` 강조 블록 + **"제외된 N편 보기" 펼침**
- [ ] `paper_done` 카드 — 3줄 요약 · **배지(본문/초록)** · 원문 초록 펼침 · arXiv 링크
- [ ] `retry` 앰버 로그 — 감추지 않는다
- [ ] `paper_failed` — **화면 대체 금지.** 타임라인 항목 + 원문 링크
- [ ] `empty` — 에러 아님. 중립 톤 + 제안 버튼
- [ ] `error` — 화면 대체. `code` 작게 노출
- [ ] 종결 이벤트 3종에서 **`EventSource.close()`**
  - **완료 기준:** `?mock=1`로 정상·부분실패·결과없음·전체실패 4가지가 전부 그려진다

### 실연결 (개발 순서 [5])
- [ ] 목 재생 → `new EventSource(...)` 교체
  - **완료 기준:** 실제 주제를 넣으면 화면에 결과가 쌓인다

> **에러 화면을 마지막으로 미루지 않는다.** 부분 실패는 예외가 아니라 일상이다.

---

## Week 4 — 근거가 이어지고, 배포된다 (07/27~07/31)

**목표: [plan.md §10](../plan.md) 6번.** 7번은 여유가 있을 때만.

- [ ] 트렌드 블록 + **논문 칩** — 클릭 시 해당 카드로 스크롤
  - **완료 기준:** 트렌드 주장 → 카드 → arXiv 원문이 클릭으로 끊기지 않고 이어진다
- [ ] 완료 헤더 고정 (검토/선별 수 · 소요시간 · LLM 호출 수)
- [ ] `stats.failed > 0`이면 "3/4편" 표시
- [ ] 배포 (Render / Railway / HF Spaces)
  - **완료 기준:** 배포 URL에서 **실시간 스트리밍이 유지된다** (`X-Accel-Buffering` 확인)
- [ ] `README.md` — 데모 URL · 스크린샷 · 무엇이 다른가
- [ ] 데모데이 시연 시나리오 — **`judge`와 `retry`가 보이는 주제**로 리허설

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
