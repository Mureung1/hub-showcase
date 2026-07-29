/**
 * 목 이벤트 재생기 — 백엔드 없이 프론트를 완성하기 위한 유일한 입력원.
 *
 * docs/spec/sse-contract.md의 이벤트 계약을 그대로 옮긴 데이터와,
 * 그것을 시간차로 발행하는 재생기(MockEventSource)만 담는다.
 * **DOM을 만지지 않는다** — 화면 조작은 전부 app.js에 모은다 (CLAUDE.md UI 규칙).
 *
 * 8-8에서 `new HubMock.MockEventSource(scenario)`를
 * `new EventSource(url)` 한 줄로 바꾸면 끝나도록 설계했다. 그래서:
 *   - 콜백에 넘기는 것은 파싱된 객체가 아니라 **JSON 문자열**(`event.data`)이다.
 *     목이 진짜보다 편하면 그 편함만큼이 실연결 순간에 한꺼번에 청구된다.
 *   - 종결 이벤트를 받아도 **스스로 닫지 않는다.** 실제 EventSource가 그러지 않기 때문이다.
 *     close()는 언제나 소비자(app.js)의 책임이다.
 *
 * 전역 오염을 피하기 위해 이름 하나(`window.HubMock`)만 노출한다.
 * ES 모듈로 만들지 않은 이유는 index.html이 빌드 없는 클래식 스크립트이기 때문이다 —
 * 실서비스 경로에서는 이 파일을 아예 로드하지 않는 선택지도 남겨둔다.
 */
(function (global) {
  "use strict";

  /**
   * 재생 배속. 계약 예시의 지연값(0/800/2500/…/14000ms)을 그대로 쓰면
   * 한 사이클을 보는 데 14초가 걸린다. 개발 중 수십 번 새로고침하는 걸 감안해
   * **비율은 유지한 채 전체를 나눈다.** 실제 타이밍을 보고 싶으면 1로 낮춘다.
   */
  const SPEED = 8;

  // ---------------------------------------------------------------------------
  // 목 데이터
  //
  // 형식: [발행 시각(ms, 시작 기준 절대값), 이벤트 dict]
  // 절대 오프셋을 유지하는 이유는 sse-contract.md의 숫자와 눈으로 대조하기 위해서다.
  // ---------------------------------------------------------------------------

  /** normal — 정상 경로. 재시도도 실패도 없다. */
  const NORMAL = [
    [0, { stage: "search", topic: "LLM agent planning" }],
    [800, { stage: "found", count: 8 }],
    [
      2500,
      {
        stage: "judge",
        total: 8,
        selected: 3,
        picked: [
          {
            title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
            reason: "planning에 계층 구조를 도입한 새 방법론. 핵심 주제와 직결.",
          },
          {
            title: "Cost-Aware Tool Selection for Planning Agents",
            reason: "계획 단계의 도구 선택 비용을 정면으로 다룬다. 최근 흐름과 맞물림.",
          },
          {
            title: "Verifier-Guided Replanning in Open-Ended Environments",
            reason: "자기 검증을 계획 루프 안에 넣은 사례. 재계획 조건이 구체적.",
          },
        ],
        excluded: [
          {
            title: "A Survey of Prompt Engineering Techniques",
            reason: "planning과 직접 관련 없는 일반 서베이.",
          },
          {
            title: "Fine-Tuning Small Language Models on Domain Corpora",
            reason: "에이전트가 아니라 사전학습·파인튜닝 주제.",
          },
          {
            title: "Benchmarking Vision-Language Models on Chart QA",
            reason: "멀티모달 평가 벤치마크. 계획 능력과 무관.",
          },
          {
            title: "Efficient KV-Cache Compression for Long Contexts",
            reason: "추론 최적화 기법으로, 판단·계획 로직을 다루지 않음.",
          },
          {
            title: "LLM Agents for Web Navigation: A Position Paper",
            reason: "구체적 방법이나 실험 없이 주장만 담긴 포지션 페이퍼.",
          },
        ],
      },
    ],
    [
      3200,
      {
        stage: "read",
        index: 1,
        total: 3,
        title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
        used_fulltext: true,
        reason: "새 알고리즘을 제안하나 초록에 세부 설정이 없음",
      },
    ],
    [
      6000,
      {
        stage: "paper_done",
        index: 1,
        title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
        arxiv_id: "2506.14231",
        url: "https://arxiv.org/abs/2506.14231",
        date: "2026-06-18",
        used_fulltext: true,
        retried: 0,
        summary: {
          contribution: "긴 작업을 상위 계획과 하위 실행으로 분리하는 계층적 에이전트 구조를 제안.",
          method: "상위 플래너가 목표를 하위 작업으로 분해하고, 실패 시 상위로 되돌려 재계획.",
          result: "WebArena에서 단일 에이전트 대비 성공률 18%p 상승. 다만 비용은 2.3배.",
        },
        abstract:
          "We present Tree-of-Agents, a hierarchical planning framework for long-horizon tasks. " +
          "A planner decomposes a goal into subtasks that are delegated to executor agents, and " +
          "failures are propagated upward to trigger replanning. On WebArena, Tree-of-Agents " +
          "improves success rate by 18 points over a strong single-agent baseline.",
      },
    ],
    [
      6600,
      {
        stage: "read",
        index: 2,
        total: 3,
        title: "Cost-Aware Tool Selection for Planning Agents",
        used_fulltext: false,
        reason: "초록에 방법과 결과 수치가 모두 드러나 있음",
      },
    ],
    [
      8600,
      {
        stage: "paper_done",
        index: 2,
        title: "Cost-Aware Tool Selection for Planning Agents",
        arxiv_id: "2506.09877",
        url: "https://arxiv.org/abs/2506.09877",
        date: "2026-06-11",
        used_fulltext: false,
        retried: 0,
        summary: {
          contribution: "도구 호출 비용을 계획 단계의 1급 변수로 올린 선택 정책을 제안.",
          method: "각 도구의 기대 이득과 토큰 비용을 추정해, 임계값을 넘을 때만 호출.",
          result: "정확도를 2%p 이내로 유지하면서 LLM 호출 수를 41% 줄임.",
        },
        abstract:
          "Tool-augmented agents often call expensive tools when cheaper evidence would suffice. " +
          "We treat call cost as a first-class term in the planning objective and estimate the " +
          "expected gain of each tool before invoking it, cutting LLM calls by 41% with a 2-point " +
          "accuracy drop.",
      },
    ],
    [
      9200,
      {
        stage: "read",
        index: 3,
        total: 3,
        title: "Verifier-Guided Replanning in Open-Ended Environments",
        used_fulltext: true,
        reason: "검증기 설계가 핵심인데 초록에는 결과만 있음",
      },
    ],
    [
      12000,
      {
        stage: "paper_done",
        index: 3,
        title: "Verifier-Guided Replanning in Open-Ended Environments",
        arxiv_id: "2506.20114",
        url: "https://arxiv.org/abs/2506.20114",
        date: "2026-06-25",
        used_fulltext: true,
        retried: 0,
        summary: {
          contribution: "계획 실행 중 검증기가 실패를 조기에 잡아 재계획을 유발하는 구조를 제안.",
          method: "각 하위 단계 결과를 학습된 검증기로 채점하고, 임계 미만이면 상위로 되돌림.",
          result: "장기 과제에서 완주율 27%p 상승. 검증기 오탐이 남은 실패의 절반을 차지.",
        },
        abstract:
          "We study when an agent should abandon its current plan. A learned verifier scores each " +
          "intermediate result and triggers replanning when confidence drops, improving completion " +
          "rate by 27 points on open-ended tasks. Verifier false positives remain the dominant " +
          "failure mode.",
      },
    ],
    [12600, { stage: "trend" }],
    [
      14500,
      {
        stage: "done",
        elapsed: 118.4,
        stats: { scanned: 8, selected: 3, succeeded: 3, failed: 0, llm_calls: 17 },
        trend: {
          flows: [
            {
              title: "계획을 한 번에 세우지 않는다",
              body:
                "세 편 모두 계획을 한 번에 확정하지 않고, 실행 도중 얻은 신호로 되돌아갑니다. " +
                "분해의 단위는 다르지만 '실패를 상위로 올려보낸다'는 구조는 같습니다.",
              papers: [1, 3],
            },
            {
              title: "판단의 근거로 비용이 등장하기 시작했다",
              body:
                "성공률만 보던 이전 흐름과 달리, 도구를 부를지 말지를 비용으로 결정하는 " +
                "논문이 나오고 있습니다.",
              papers: [2],
            },
          ],
          gap: "세 편 모두 단일 에이전트를 전제합니다. 에이전트 사이의 계획 충돌을 다룬 논문은 없습니다.",
        },
      },
    ],
  ];

  /**
   * partial — 부분 실패. **이 서비스에서 예외가 아니라 일상인 경로다.**
   * retry 1회와 paper_failed 1편을 포함하고, stats.failed > 0으로 끝난다.
   */
  const PARTIAL = [
    [0, { stage: "search", topic: "LLM agent planning" }],
    [800, { stage: "found", count: 12 }],
    [
      2500,
      {
        stage: "judge",
        total: 12,
        selected: 4,
        picked: [
          {
            title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
            reason: "planning에 계층 구조를 도입한 새 방법론. 핵심 주제와 직결.",
          },
          {
            title: "Cost-Aware Tool Selection for Planning Agents",
            reason: "계획 단계의 도구 선택 비용을 정면으로 다룬다.",
          },
          {
            title: "Memory-Augmented Planning for LLM Agents",
            reason: "장기 기억을 계획에 연결한 구조. 인용이 빠르게 늘고 있음.",
          },
          {
            title: "Verifier-Guided Replanning in Open-Ended Environments",
            reason: "자기 검증을 계획 루프 안에 넣은 사례.",
          },
        ],
        excluded: [
          {
            title: "A Survey of Prompt Engineering Techniques",
            reason: "planning과 직접 관련 없는 일반 서베이.",
          },
          {
            title: "Fine-Tuning Small Language Models on Domain Corpora",
            reason: "에이전트가 아니라 사전학습·파인튜닝 주제.",
          },
          {
            title: "Benchmarking Vision-Language Models on Chart QA",
            reason: "멀티모달 평가 벤치마크. 계획 능력과 무관.",
          },
          {
            title: "Efficient KV-Cache Compression for Long Contexts",
            reason: "추론 최적화 기법으로, 판단·계획 로직을 다루지 않음.",
          },
          {
            title: "LLM Agents for Web Navigation: A Position Paper",
            reason: "구체적 방법이나 실험 없이 주장만 담긴 포지션 페이퍼.",
          },
          {
            title: "Prompt Compression for Cheaper Inference",
            reason: "비용 절감 기법이지만 계획·판단 과정과 접점이 없음.",
          },
          {
            title: "Dataset Distillation for Instruction Tuning",
            reason: "데이터 구축 방법론. 에이전트 실행 시점과 무관.",
          },
          {
            title: "On the Reproducibility of Agent Benchmarks",
            reason: "벤치마크 재현성 논의로, 새 방법론을 제안하지 않음.",
          },
        ],
      },
    ],
    [
      3200,
      {
        stage: "read",
        index: 1,
        total: 4,
        title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
        used_fulltext: true,
        reason: "새 알고리즘을 제안하나 초록에 세부 설정이 없음",
      },
    ],
    [
      6000,
      {
        stage: "paper_done",
        index: 1,
        title: "Tree-of-Agents: Hierarchical Planning for Long-Horizon LLM Agents",
        arxiv_id: "2506.14231",
        url: "https://arxiv.org/abs/2506.14231",
        date: "2026-06-18",
        used_fulltext: true,
        retried: 0,
        summary: {
          contribution: "긴 작업을 상위 계획과 하위 실행으로 분리하는 계층적 에이전트 구조를 제안.",
          method: "상위 플래너가 목표를 하위 작업으로 분해하고, 실패 시 상위로 되돌려 재계획.",
          result: "WebArena에서 단일 에이전트 대비 성공률 18%p 상승. 다만 비용은 2.3배.",
        },
        abstract:
          "We present Tree-of-Agents, a hierarchical planning framework for long-horizon tasks. " +
          "A planner decomposes a goal into subtasks that are delegated to executor agents, and " +
          "failures are propagated upward to trigger replanning. On WebArena, Tree-of-Agents " +
          "improves success rate by 18 points over a strong single-agent baseline.",
      },
    ],
    [
      6600,
      {
        stage: "read",
        index: 2,
        total: 4,
        title: "Cost-Aware Tool Selection for Planning Agents",
        used_fulltext: false,
        reason: "초록에 방법과 결과 수치가 모두 드러나 있음",
      },
    ],
    // 자기 검증(4단계)이 요약을 반려한 지점. 감추지 않는다 — 하이라이트 2.
    [
      8200,
      {
        stage: "retry",
        index: 2,
        attempt: 1,
        feedback: "실험 설정 설명이 누락됨",
      },
    ],
    [
      10500,
      {
        stage: "paper_done",
        index: 2,
        title: "Cost-Aware Tool Selection for Planning Agents",
        arxiv_id: "2506.09877",
        url: "https://arxiv.org/abs/2506.09877",
        date: "2026-06-11",
        used_fulltext: false,
        retried: 1,
        summary: {
          contribution: "도구 호출 비용을 계획 단계의 1급 변수로 올린 선택 정책을 제안.",
          method: "기대 이득과 토큰 비용을 추정해 임계값을 넘을 때만 호출. HotpotQA·WebArena에서 평가.",
          result: "정확도를 2%p 이내로 유지하면서 LLM 호출 수를 41% 줄임.",
        },
        abstract:
          "Tool-augmented agents often call expensive tools when cheaper evidence would suffice. " +
          "We treat call cost as a first-class term in the planning objective and estimate the " +
          "expected gain of each tool before invoking it, cutting LLM calls by 41% with a 2-point " +
          "accuracy drop.",
      },
    ],
    [
      11100,
      {
        stage: "read",
        index: 3,
        total: 4,
        title: "Memory-Augmented Planning for LLM Agents",
        used_fulltext: true,
        reason: "기억 구조가 핵심인데 초록에는 결과만 있음",
      },
    ],
    // 부분 실패. 화면을 대체하지 않는다 — 위의 카드 2장은 그대로 남는다.
    [
      13500,
      {
        stage: "paper_failed",
        index: 3,
        title: "Memory-Augmented Planning for LLM Agents",
        url: "https://arxiv.org/abs/2506.11902",
        reason: "PDF 본문 추출에 실패했고, 초록만으로는 검증을 두 번 모두 통과하지 못했습니다.",
      },
    ],
    [
      14100,
      {
        stage: "read",
        index: 4,
        total: 4,
        title: "Verifier-Guided Replanning in Open-Ended Environments",
        used_fulltext: true,
        reason: "검증기 설계가 핵심인데 초록에는 결과만 있음",
      },
    ],
    [
      16800,
      {
        stage: "paper_done",
        index: 4,
        title: "Verifier-Guided Replanning in Open-Ended Environments",
        arxiv_id: "2506.20114",
        url: "https://arxiv.org/abs/2506.20114",
        date: "2026-06-25",
        used_fulltext: true,
        retried: 0,
        summary: {
          contribution: "계획 실행 중 검증기가 실패를 조기에 잡아 재계획을 유발하는 구조를 제안.",
          method: "각 하위 단계 결과를 학습된 검증기로 채점하고, 임계 미만이면 상위로 되돌림.",
          result: "장기 과제에서 완주율 27%p 상승. 검증기 오탐이 남은 실패의 절반을 차지.",
        },
        abstract:
          "We study when an agent should abandon its current plan. A learned verifier scores each " +
          "intermediate result and triggers replanning when confidence drops, improving completion " +
          "rate by 27 points on open-ended tasks. Verifier false positives remain the dominant " +
          "failure mode.",
      },
    ],
    [17400, { stage: "trend" }],
    [
      19500,
      {
        stage: "done",
        elapsed: 134.2,
        // succeeded + failed == selected. 이 불변식이 깨지면 헤더의 "3/4편"이 거짓말이 된다.
        stats: { scanned: 12, selected: 4, succeeded: 3, failed: 1, llm_calls: 23 },
        trend: {
          flows: [
            {
              title: "계획을 한 번에 세우지 않는다",
              body:
                "성공한 세 편 중 두 편이 계획을 확정하지 않고 실행 중 얻은 신호로 되돌아갑니다. " +
                "분해의 단위는 다르지만 '실패를 상위로 올려보낸다'는 구조는 같습니다.",
              papers: [1, 4],
            },
            {
              title: "판단의 근거로 비용이 등장하기 시작했다",
              body:
                "성공률만 보던 이전 흐름과 달리, 도구를 부를지 말지를 비용으로 결정하는 " +
                "논문이 나오고 있습니다.",
              papers: [2],
            },
          ],
          // gap은 선택적이다(계약상 null 가능). 프론트는 없을 때도 그려져야 한다.
          gap: null,
        },
      },
    ],
  ];

  /**
   * empty — 결과 없음. **에러가 아니다.**
   * 에이전트는 정상 작동해서 '없다'는 사실을 알아냈다.
   * count가 0이어도 found를 먼저 보낸다 (sse-contract.md §found).
   */
  const EMPTY = [
    [0, { stage: "search", topic: "quantum blockchain agent" }],
    [900, { stage: "found", count: 0 }],
    [
      1800,
      {
        stage: "empty",
        scanned: 0,
        suggestions: ["LLM agent planning", "retrieval augmented generation"],
      },
    ],
  ];

  /**
   * error — 전체 실패. 화면을 대체해도 되는 유일한 경우다.
   * **paper_done이 하나도 나가기 전에** 끝난다 — 계약이 error를 허용하는 조건.
   */
  const ERROR = [
    [0, { stage: "search", topic: "LLM agent planning" }],
    [800, { stage: "found", count: 12 }],
    [
      3000,
      {
        stage: "error",
        message: "LLM 호출이 사용량 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요.",
        code: "rate_limit_exceeded",
        at: "12편을 판단하던 중",
      },
    ],
  ];

  /**
   * barren — 검색은 됐지만 **판단 결과 0편**. `empty`가 아니라 카드 없는 `done`으로 끝난다.
   *
   * agent.py:324-399에서 picked_list가 비면 논문 루프가 한 번도 돌지 않고
   * 그대로 trend → done으로 간다. trend()는 0편이면 LLM 없이
   * `{"flows": [], "gap": null}`을 돌려준다 (agent.py:281-282).
   *
   * 계약에 문서화되지 않은 경로라 이슈 #79로 등록해뒀다. 다만 검색어를 조금만
   * 애매하게 넣어도 실제로 나오는 결말이라, 화면을 안 만들어두면 데모에서 그대로 터진다.
   * "결과 없음"은 에러가 아니다 — empty와 같은 중립 톤으로 그려야 한다.
   */
  const BARREN = [
    [0, { stage: "search", topic: "agent" }],
    [800, { stage: "found", count: 6 }],
    [
      2500,
      {
        stage: "judge",
        total: 6,
        selected: 0,
        // 선별 0편이어도 judge는 나간다. 제외 사유는 이 화면에서 유일한 정보다.
        picked: [],
        excluded: [
          {
            title: "A Survey of Prompt Engineering Techniques",
            reason: "주제가 너무 넓어 특정할 수 없고, 새 방법론을 제안하지 않음.",
          },
          {
            title: "Fine-Tuning Small Language Models on Domain Corpora",
            reason: "에이전트가 아니라 사전학습·파인튜닝 주제.",
          },
          {
            title: "Benchmarking Vision-Language Models on Chart QA",
            reason: "멀티모달 평가 벤치마크. 에이전트와 무관.",
          },
          {
            title: "Efficient KV-Cache Compression for Long Contexts",
            reason: "추론 최적화 기법으로, 판단·행동 로직을 다루지 않음.",
          },
          {
            title: "On the Reproducibility of Agent Benchmarks",
            reason: "재현성 논의로, 새 방법론을 제안하지 않음.",
          },
          {
            title: "Agent-Based Modeling in Epidemiology",
            reason: "같은 'agent'라는 단어를 쓰지만 LLM과 무관한 시뮬레이션 분야.",
          },
        ],
      },
    ],
    [3200, { stage: "trend" }],
    [
      4200,
      {
        stage: "done",
        elapsed: 21.7,
        // succeeded + failed == selected == 0. 불변식은 여기서도 성립한다.
        stats: { scanned: 6, selected: 0, succeeded: 0, failed: 0, llm_calls: 7 },
        // 0편이면 LLM을 부르지 않으므로 flows는 비어 있다. 빈 트렌드 블록을 그리지 않는다.
        trend: { flows: [], gap: null },
      },
    ],
  ];

  const SCENARIOS = {
    normal: NORMAL,
    partial: PARTIAL,
    barren: BARREN,
    empty: EMPTY,
    error: ERROR,
  };

  /** 쿼리스트링 값 → 시나리오 이름. `?mock=1`은 normal의 별칭이다. */
  const QUERY_ALIASES = {
    1: "normal",
    true: "normal",
    normal: "normal",
    partial: "partial",
    barren: "barren",
    empty: "empty",
    error: "error",
  };

  /**
   * `?mock=` 값을 시나리오 이름으로 바꾼다. 목을 쓰지 않으면 null.
   *
   * 이 매핑은 목의 지식이므로 여기 두지만, `location`을 직접 읽지는 않는다.
   * 인자로 받아야 브라우저 없이도 확인할 수 있다.
   *
   * @param {string} [search] - `location.search` 형식의 문자열
   * @returns {string|null} 시나리오 이름, 목을 쓰지 않으면 null
   */
  function scenarioFromQuery(search) {
    const raw = search === undefined ? global.location.search : search;
    const value = new URLSearchParams(raw).get("mock");
    if (value === null) return null;

    const name = QUERY_ALIASES[value.toLowerCase()];
    if (name === undefined) {
      console.warn(`[mock] 알 수 없는 시나리오 '${value}' — normal로 대체한다.`);
      return "normal";
    }
    return name;
  }

  /**
   * EventSource와 같은 모양으로 목 이벤트를 재생한다.
   *
   * 실제 EventSource와 의도적으로 똑같이 맞춘 것:
   * - `event.data`는 **JSON 문자열**이다. 소비자가 JSON.parse를 하도록 강제한다.
   * - 종결 이벤트를 보내도 **스스로 닫지 않는다.** close()는 소비자의 책임이다.
   * - close() 이후로는 어떤 이벤트도 발행하지 않는다.
   *
   * 의도적으로 다르게 둔 것:
   * - **재연결하지 않는다.** 실제 EventSource는 연결이 끊기면 자동 재연결하지만,
   *   목에는 끊길 연결이 없다. 이 차이는 프론트 코드에 영향을 주지 않는다.
   */
  class MockEventSource extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSED = 2;

    /**
     * @param {string} [scenario="normal"] - SCENARIOS의 키
     * @param {number} [speed=SPEED] - 재생 배속 (클수록 빠름)
     */
    constructor(scenario = "normal", speed = SPEED) {
      super();

      const frames = SCENARIOS[scenario];
      if (frames === undefined) {
        throw new Error(
          `[mock] 알 수 없는 시나리오: ${scenario} (가능: ${Object.keys(SCENARIOS).join(", ")})`
        );
      }

      // EventSource와 이름을 맞춘 필드들. app.js가 목/실제를 구분하지 않아도 되게 한다.
      this.url = `mock:${scenario}`;
      this.readyState = MockEventSource.CONNECTING;
      this.withCredentials = false;
      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;

      // 살아있는 setTimeout id. close()가 재생을 멈출 수 있는 유일한 수단이다.
      this._timerIds = [];

      this._schedule(frames, speed);
    }

    /** 프레임마다 타이머를 걸어둔다. 지연은 시작 기준 절대값이므로 누적하지 않는다. */
    _schedule(frames, speed) {
      // open은 첫 메시지보다 반드시 먼저 간다. 실제 EventSource도 연결 수립 시 open을 먼저 준다.
      this._timerIds.push(
        global.setTimeout(() => {
          this.readyState = MockEventSource.OPEN;
          this._dispatch(new Event("open"));
        }, 0)
      );

      for (const [delayMs, event] of frames) {
        this._timerIds.push(
          global.setTimeout(() => this._emit(event), delayMs / speed)
        );
      }
    }

    /** 이벤트 dict 하나를 발행한다. 여기서 문자열로 만드는 것이 핵심이다. */
    _emit(event) {
      if (this.readyState === MockEventSource.CLOSED) return;

      // 서버가 `data: {json}\n\n`으로 보내면 브라우저는 그 JSON을 **문자열 그대로** 준다.
      // 여기서 객체를 넘기면 app.js가 JSON.parse를 안 쓰게 되고,
      // 8-8에서 실연결로 바꾸는 순간 모든 stage가 한꺼번에 깨진다.
      this._dispatch(new MessageEvent("message", { data: JSON.stringify(event) }));
    }

    /** onXxx 프로퍼티와 addEventListener 양쪽에 전달한다 (실제 EventSource와 동일). */
    _dispatch(event) {
      const handler = this[`on${event.type}`];
      if (typeof handler === "function") handler.call(this, event);
      this.dispatchEvent(event);
    }

    /**
     * 재생을 중단한다. 예약된 타이머를 전부 취소하므로 이후 이벤트는 오지 않는다.
     *
     * 실제 EventSource에서 이걸 부르지 않으면 자동 재연결이 일어나고
     * → 에이전트가 통째로 재실행되고 → API 비용이 탄다.
     * 목에서도 같은 자리에 close()를 부르는 습관을 들이기 위해 동일한 이름으로 둔다.
     */
    close() {
      this.readyState = MockEventSource.CLOSED;
      for (const id of this._timerIds) global.clearTimeout(id);
      this._timerIds = [];
    }
  }

  global.HubMock = { MockEventSource, scenarioFromQuery, SCENARIOS, SPEED };
})(typeof window !== "undefined" ? window : globalThis);
