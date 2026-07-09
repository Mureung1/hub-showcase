# API 설계 맛보기 — 코어 루프 후보 생성 API

> 초안. 실제 구현 전 리뷰용으로 작성했고, 2주차에 이 문서를 기준으로 `server/`에 구현할 예정이다.

## 왜 이 기능을 골랐나

Core Loop Builder의 7개 기능 중 하나를 골라 API를 설계해보라고 했을 때, 가장 먼저 후보에 오른 건 "입력 정리"였다. 제일 단순해 보였기 때문이다. 하지만 다시 보니 입력 정리는 사실 API라기보다 폼 검증에 가깝고, 이 서비스가 실제로 "AI Agent 서비스"라고 불릴 자격이 있는지를 보여주는 기능은 **코어 루프 후보 브레인스토밍**이라고 판단했다.

이유는 두 가지다.

첫째, 오늘 화면 디자인에서 세 화면(입력 → 후보 선택 → 루프 시각화) 중 정확히 가운데에 있는 화면이 이 기능의 결과를 보여주는 화면이다. 디자인과 API를 같이 고민하니 "후보 카드에 뭐가 들어가야 하는가"가 곧 "응답 스키마에 뭐가 들어가야 하는가"와 같은 질문이라는 걸 알게 됐다.

둘째, 기획서의 7-Agent 파이프라인(Input → Genre Loop → Reference Analysis → **Brainstorming** → Loop Visualizer → Portfolio Writer → Critic)에서 Brainstorming Agent는 앞의 두 에이전트(장르 분석, 참고 게임 분석) 결과를 입력으로 받고, 뒤의 두 단계(시각화, 기획 초안)에서 쓸 데이터를 만들어내는 중간 허브 역할을 한다. 이 API 하나만 제대로 설계해도 파이프라인 전체의 데이터 흐름을 검증해볼 수 있다.

## 엔드포인트

```
POST /api/loops/candidates
```

### 요청

```json
{
  "genre": "로그라이크 덱빌딩 RPG",
  "referenceGames": ["Slay the Spire", "Hades", "Limbus Company"],
  "desiredExperience": "짧은 플레이 세션 안에서 매번 다른 선택과 성장의 재미를 느끼게 하고 싶다.",
  "focusArea": "시스템 기획"
}
```

| 필드 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `genre` | string | O | 사용자가 만들고 싶은 게임 장르 |
| `referenceGames` | string[] | O (1개 이상) | 참고하고 싶은 게임 목록 |
| `desiredExperience` | string | O | 원하는 플레이 경험 (자유 서술) |
| `focusArea` | string | X | 관심 기획 분야. 없으면 서버가 일반적인 시스템/콘텐츠 균형으로 생성 |

`genre`와 `desiredExperience`를 필수로 두고 `focusArea`만 선택으로 둔 이유는, 기획서의 리스크 표에 있는 "결과가 장르별 기본 루프 수준으로 너무 일반적일 수 있음"이라는 항목 때문이다. 개인화의 핵심은 장르가 아니라 `desiredExperience`에 있다고 판단했고, 이 필드가 비어있는 요청은 애초에 막고 싶었다.

### 응답 (200)

```json
{
  "candidates": [
    {
      "id": "candidate-a",
      "label": "안정형",
      "title": "전략 덱 성장 루프",
      "description": "전투 선택과 보상 선택이 덱의 방향을 바꾸며, 다음 전투의 해법을 새로 만듭니다.",
      "loopSteps": ["전투 진입", "카드 사용", "보상 선택", "덱 강화", "더 어려운 전투", "반복"],
      "score": 92,
      "tags": ["덱빌딩", "전략"]
    },
    {
      "id": "candidate-b",
      "label": "차별화형",
      "title": "위험 보상 탐험 루프",
      "description": "안전한 보상과 위험한 보상 사이의 선택이 다음 경로와 전투 난도를 결정합니다.",
      "loopSteps": ["위험 지역 선택", "카드와 유물 획득", "덱 방향 강화", "강화된 적과 조우", "다음 경로 재선택"],
      "score": 96,
      "tags": ["리스크", "탐험"]
    }
  ],
  "meta": {
    "genreBaseline": "전투 진입 → 전술 선택 → 보상 획득 → 덱 성장 → 더 어려운 전투",
    "referenceInsights": [
      "Slay the Spire: 보상 선택이 다음 전투 전략을 바꿈",
      "Hades: 실패해도 성장 자원이 남아 재도전 동기를 만듦"
    ]
  }
}
```

응답을 설계하면서 가장 고민한 지점은 **`candidates` 배열만 반환할지, `meta`를 같이 줄지**였다. 기획서상 브레인스토밍 이전에 Genre Loop Agent와 Reference Analysis Agent의 결과가 먼저 나온다. 이걸 별도 API 호출(`/api/loops/genre-baseline`, `/api/loops/reference-analysis`)로 쪼갤 수도 있었지만, 그러면 화면 하나(후보 선택 화면)를 그리기 위해 프론트가 API를 3번 호출하고 로딩 상태를 3번 조율해야 한다. 지금 단계에서는 "후보 화면에 필요한 걸 한 번에 준다"가 더 실용적이라고 판단해서, 분석 결과는 `meta`로 접어 넣고 `candidates`가 주인공이 되는 형태로 설계했다. 대신 각 에이전트의 책임은 서버 내부 함수(`buildGenreBaseline()`, `analyzeReferences()`, `brainstormCandidates()`)로는 분리해서, 나중에 화면이 늘어나 분석 결과를 먼저 보여줘야 할 때 엔드포인트만 새로 열면 되게 해뒀다.

`score`를 0~100 숫자로 준 것도 의도적인 선택이다. 디자인 목업의 후보 카드에 진행바(추천도)가 있는데, 이 숫자가 실제로는 "AI가 얼마나 확신하는가"가 아니라 "이 후보가 사용자의 `desiredExperience`와 얼마나 잘 맞는가"에 대한 자기평가 점수라는 걸 명확히 하기 위해 필드명을 `confidence`가 아니라 `score`로 잡았다. 이 점수를 사용자에게 절대적인 진실처럼 보이게 하고 싶지 않아서, 프론트에서는 "추천도"라는 표현으로 감싸기로 했다(설계 문서와 UI 카피가 어긋나지 않게 맞춘 부분).

### 에러

| 상태 코드 | 상황 | 응답 |
|---|---|---|
| 400 | `genre`/`desiredExperience` 누락, `referenceGames` 빈 배열 | `{ "error": "MISSING_REQUIRED_FIELD", "field": "desiredExperience" }` |
| 422 | LLM이 파싱 불가능한 형식으로 응답 (드물지만 발생 가능) | `{ "error": "GENERATION_PARSE_FAILED" }` — 프론트는 "다시 시도" 버튼을 보여준다 |
| 502 | Claude API 자체 장애/타임아웃 | `{ "error": "UPSTREAM_UNAVAILABLE" }` |
| 429 | 서버 자체 rate limit (세션당 분당 N회) | `{ "error": "RATE_LIMITED", "retryAfterSeconds": 30 }` |

에러를 설계하면서 가장 신경 쓴 건 422다. LLM 응답은 결정론적이지 않기 때문에, "성공했지만 우리가 기대한 JSON 구조가 아닌" 상황이 실패의 대부분을 차지할 거라고 예상한다. 이걸 500(서버 에러)으로 뭉뚱그리지 않고 422로 분리한 이유는, 프론트 입장에서 "재시도하면 될 수도 있는 실패"와 "재시도해도 소용없는 실패"를 구분해서 다른 UX를 보여줘야 하기 때문이다.

## 스트리밍 여부

Claude API는 스트리밍 응답을 지원하지만, 이 엔드포인트는 **스트리밍하지 않기로** 했다. 이유는 응답이 "후보 3개 + meta"라는 하나의 완성된 JSON 구조여야 프론트가 후보 카드 3개를 한 번에 렌더링할 수 있기 때문이다. 스트리밍은 텍스트가 순서대로 쌓여도 자연스러운 경우(예: 포트폴리오 기획 초안처럼 긴 글)에 어울리고, 이 API처럼 구조화된 여러 항목을 동시에 비교해야 하는 화면에는 오히려 "카드가 하나씩 팝업되는" 부자연스러운 로딩 경험을 만든다고 판단했다. 대신 로딩 중에는 프론트에서 스켈레톤 카드 3개를 먼저 보여주는 방식으로 체감 대기 시간을 줄이기로 했다.

반면 6번 기능인 포트폴리오 초안 생성(`/api/portfolio/draft` 예정)은 이 판단과 반대로 스트리밍을 쓰는 게 맞다고 본다 — 이 API를 설계하면서 오히려 "모든 AI 엔드포인트를 스트리밍으로 통일해야 하나?"라는 질문에 대한 답을 하나 얻은 셈이다. 응답의 형태(구조화된 배열 vs. 긴 글)가 스트리밍 여부를 결정해야지, "AI 호출이니까 스트리밍"이라는 규칙은 없다는 것.

## 파이프라인 내 위치와 트레이드오프

```
Input Agent → Genre Loop Agent → Reference Analysis Agent → [Brainstorming Agent] → Loop Visualizer Agent → Portfolio Writer Agent → Critic Agent
```

`POST /api/loops/candidates`는 Input, Genre Loop, Reference Analysis 세 단계를 서버 내부에서 순차 실행한 뒤 Brainstorming까지 마친 결과를 한 번에 반환한다. 트레이드오프는 명확하다.

- **장점**: 프론트가 단순해진다. 후보 선택 화면은 API 호출 1번, 로딩 상태 1개만 관리하면 된다.
- **단점**: 만약 나중에 "장르 기본 루프만 먼저 보여주고, 사용자가 확인 버튼을 눌러야 후보를 생성"하는 식으로 UX가 바뀌면, 지금 구조에서는 엔드포인트를 쪼개야 한다.

MVP 범위(4주, 그중에서도 2주차에 구현)에서는 "빠르게 끝까지 흐름을 완성하는 것"이 우선이므로 후자의 유연성을 지금 포기하기로 했다. 다만 서버 내부 함수는 각 에이전트 단위로 분리해뒀기 때문에, 엔드포인트를 나중에 쪼개는 리팩토링 비용은 크지 않을 것이다.
