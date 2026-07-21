# SSE 이벤트 계약

> 백엔드와 프론트를 잇는 **유일한** 인터페이스.
> 이 문서가 확정되면 양쪽을 따로 만들 수 있다. 프론트는 가짜 이벤트로, 백엔드는 curl로.
> **여기 없는 필드는 보내지 않는다. 여기 있는 필드는 반드시 보낸다.**
>
> **참고**
> - 무엇을 왜 만드는가 → `product_spec_v2.md`
> - 파일 구조·금지 사항 → `CLAUDE.md`
> - 각 이벤트를 만드는 판단 로직 → `prompts.md`

## 전송 형식

```
GET /api/brief/stream?topic={URL인코딩된 주제}

Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no          ← 프록시 버퍼링 방지. 없으면 배포 후 실시간이 사라진다

data: {"stage":"search","topic":"LLM agent planning"}\n\n
data: {"stage":"found","count":12}\n\n
...
```

- 반드시 **GET**. EventSource는 POST를 지원하지 않는다.
- 각 메시지는 `data: ` 접두 + JSON 1줄 + **`\n\n`**. 빈 줄 하나 빠지면 브라우저가 인식하지 못한다.
- JSON은 `ensure_ascii=False`. 한글이 이스케이프되면 디버깅이 불가능해진다.
- 모든 이벤트에 `stage` 필드가 있다. 프론트는 `stage`로만 분기한다.

---

## 이벤트 목록

### `search` — 검색 시작
```json
{"stage": "search", "topic": "LLM agent planning"}
```
프론트: 흐린 로그 1줄. `arXiv 검색 — '{topic}'`

---

### `found` — 검색 완료
```json
{"stage": "found", "count": 12}
```
프론트: 흐린 로그 1줄. `{count}편 발견`
`count == 0`이어도 이 이벤트를 보낸다. 그다음 `empty`가 온다.

---

### `judge` — 중요도 판단 완료 ★

```json
{
  "stage": "judge",
  "total": 12,
  "selected": 4,
  "picked": [
    {"title": "Tree-of-Agents: Hierarchical Planning...", "reason": "planning에 계층 구조를 도입한 새 방법론. 핵심 주제와 직결."}
  ],
  "excluded": [
    {"title": "A Survey of Prompt Engineering", "reason": "planning과 직접 관련 없는 일반 서베이."}
  ]
}
```

프론트: **강조 블록.** `{total}편 중 {selected}편 선별 · {total-selected}편 제외`
`picked`는 펼친 상태, `excluded`는 접힌 상태로 "제외된 N편 보기".

> **`excluded`를 생략하지 말 것.** 제외 사유가 없으면 "놓치지 않기"라는 이 서비스의 핵심 가치가 증명되지 않는다.
> 이 이벤트가 이 서비스의 하이라이트 1이다.

---

### `read` — 논문 읽기 시작 ★

```json
{
  "stage": "read",
  "index": 1,
  "total": 4,
  "title": "Tree-of-Agents: Hierarchical Planning...",
  "used_fulltext": true,
  "reason": "새 알고리즘을 제안하나 초록에 세부 설정이 없음"
}
```

프론트: 현재 진행 표시 갱신.
- `used_fulltext: true` → `'{title}' — 본문까지 읽는 중`
- `used_fulltext: false` → `'{title}' — 초록으로 충분하다고 판단`

> `used_fulltext`는 **도구 선택이 사용자 눈에 보이는 유일한 지점**이다. 카드 배지의 원천이 된다.

---

### `retry` — 자기 검증 실패, 재시도 ★

```json
{
  "stage": "retry",
  "index": 1,
  "attempt": 1,
  "feedback": "실험 설정 설명이 누락됨"
}
```

프론트: 앰버 톤 로그 1줄. `요약 보완 중 ({attempt}회) — 스스로 검증한 결과: {feedback}`

> **감추지 말 것.** 스스로 점검했다는 증거다. 하이라이트 2.
> `attempt`는 1부터. `MAX_RETRY = 2`이므로 최대 2회.

---

### `paper_done` — 논문 1편 완료 ★

```json
{
  "stage": "paper_done",
  "index": 1,
  "title": "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
  "arxiv_id": "2506.14231",
  "url": "https://arxiv.org/abs/2506.14231",
  "date": "2026-06-18",
  "used_fulltext": true,
  "retried": 1,
  "summary": {
    "contribution": "긴 작업을 상위 계획과 하위 실행으로 분리하는 계층적 에이전트 구조를 제안.",
    "method": "상위 플래너가 목표를 하위 작업으로 분해하고, 실패 시 상위로 되돌려 재계획.",
    "result": "WebArena에서 단일 에이전트 대비 성공률 18%p 상승. 다만 비용은 2.3배."
  },
  "abstract": "We present Tree-of-Agents, a hierarchical..."
}
```

프론트: **카드를 타임라인에 즉시 추가.**

> **논문 1편이 끝날 때마다 즉시 보낸다.** 전부 모아서 마지막에 보내면 안 된다.
> 사용자는 3분을 기다리는 게 아니라 30초마다 뭔가를 얻어야 한다.
>
> `summary`는 **반드시 3키 고정**(`contribution`/`method`/`result`). 자유 문단 금지.
> 여러 카드를 세로로 훑을 때 같은 위치에 같은 정보가 있어야 눈으로 비교된다.
>
> `abstract`(원문 초록)는 **필수**. 요약을 검증할 수 없으면 연구자는 믿지 않는다.

---

### `paper_failed` — 논문 1편 실패 (부분 실패)

```json
{
  "stage": "paper_failed",
  "index": 3,
  "title": "Memory-Augmented Planning for LLM Agents",
  "url": "https://arxiv.org/abs/2506.11902",
  "reason": "PDF 본문 추출에 실패했고, 초록만으로는 검증을 두 번 모두 통과하지 못했습니다."
}
```

프론트: 앰버 블록 1개. **화면을 대체하지 않는다.** 나머지 논문은 그대로 진행.

> **이건 정상적인 결말이다.** 4편 중 3편 성공은 흔하다.
> 여기서 전체 에러를 띄우면 이미 만든 3편을 버리게 된다. 3분과 API 비용을 태우고.
> `url`은 **필수**. AI가 못 읽었으면 사람이 읽으면 된다.

---

### `trend` — 트렌드 추론 시작
```json
{"stage": "trend"}
```
프론트: `논문 간 연결점을 종합하는 중`

---

### `done` — 전체 완료

```json
{
  "stage": "done",
  "elapsed": 134.2,
  "stats": {"scanned": 12, "selected": 4, "succeeded": 3, "failed": 1, "llm_calls": 23},
  "trend": {
    "flows": [
      {
        "title": "계획을 한 번에 세우지 않는다",
        "body": "네 편 중 세 편이 공통적으로 계획을 '분해'합니다...",
        "papers": [1, 2, 4]
      }
    ],
    "gap": "네 편 모두 성공률에 집중하고, 비용을 다루는 논문은 없습니다."
  }
}
```

프론트: 트렌드 블록을 타임라인 끝에 추가 + 상단 완료 헤더 고정. **`EventSource.close()` 호출.**

> `flows[].papers`는 `paper_done`의 `index` 배열. 프론트는 이걸로 **논문 칩(↑ 제목)** 을 만들고,
> 클릭 시 해당 카드로 스크롤한다. **주장에는 근거가 붙어야 한다.**
> 근거를 못 대는 흐름은 애초에 만들지 않는다.
>
> `gap`은 선택적(`null` 가능). 야심찬 항목이라 품질이 안 나오면 생략.
> `stats.failed > 0`이면 헤더에 `3/4편`으로 표시.

---

### `empty` — 결과 없음 (실패 아님)

```json
{"stage": "empty", "scanned": 12, "suggestions": ["quantum agent", "blockchain LLM"]}
```

프론트: 중립 톤. `최근 7일 안에 관련 논문이 없습니다` + 제안 버튼. `close()`.

> **에러로 처리하지 말 것.** 에이전트는 정상 작동해서 '없다'는 사실을 알아냈다.
> 빨간 화면을 띄우면 사용자는 서비스가 고장난 줄 안다.
> `suggestions`로 다음 행동을 준다. 막다른 길을 만들지 않는다.

---

### `error` — 전체 실패

```json
{
  "stage": "error",
  "message": "LLM 호출이 사용량 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요.",
  "code": "rate_limit_exceeded",
  "at": "3편 중 1편을 읽던 중"
}
```

프론트: 화면 대체. `close()`.

> **아무것도 못 건진 경우에만.** 이미 `paper_done`이 하나라도 나갔다면 `error`가 아니라
> `paper_failed` + `done`으로 마무리한다.
>
> `code`는 화면에 작게 노출한다. 타겟이 개발자라 이게 오히려 친절하고, 본인 디버깅에도 필요하다.
> `rate_limit_exceeded`는 예시가 아니라 예언이다. 무료 티어로 개발하면 반드시 만난다.

---

## 순서 규칙

```
search → found → judge → (read → [retry]* → paper_done | paper_failed)* → trend → done
                    ↘ (count 0)                                              ↘
                      empty                                                  error (언제든)
```

- `done`, `empty`, `error`는 **종결 이벤트**. 이후 아무것도 보내지 않는다.
- 종결 이벤트를 받으면 프론트는 **반드시 `close()`** 한다.
  안 하면 EventSource가 자동 재연결하고 → 에이전트가 통째로 재실행되고 → API 비용이 탄다.

---

## 프론트 개발용 목 데이터

백엔드 없이 프론트를 완성하기 위한 것. `setTimeout`으로 순서대로 던진다.

```js
const MOCK = [
  [0,    {stage:"search", topic:"LLM agent planning"}],
  [800,  {stage:"found", count:12}],
  [2500, {stage:"judge", total:12, selected:4, picked:[...], excluded:[...]}],
  [3500, {stage:"read", index:1, total:4, title:"Tree-of-Agents...", used_fulltext:true}],
  [6000, {stage:"paper_done", index:1, ...}],
  [7000, {stage:"retry", index:2, attempt:1, feedback:"실험 설정 설명이 누락됨"}],
  [9000, {stage:"paper_done", index:2, ...}],
  [10000,{stage:"paper_failed", index:3, title:"Memory-Augmented...", reason:"PDF 추출 실패"}],
  [12000,{stage:"trend"}],
  [14000,{stage:"done", elapsed:134.2, stats:{...}, trend:{...}}],
];
```

> **이 목 데이터로 프론트를 먼저 완성하라.** 부분 실패·재시도까지 포함되어 있으므로
> 정상 경로만이 아니라 예외 경로까지 화면이 다 만들어진다.
> 백엔드가 준비되면 `MOCK` 재생을 `new EventSource(...)`로 바꾸기만 하면 된다.
