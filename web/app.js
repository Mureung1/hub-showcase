/**
 * 타임라인 프론트엔드.
 *
 * **DOM 조작은 전부 이 파일에 모은다** (CLAUDE.md 코드 컨벤션).
 * mock.js는 이벤트를 만들 뿐 화면을 모르고, 화면은 여기서만 바뀐다.
 *
 * 이벤트는 **`stage`로만 분기한다**. 필드가 있는지, 몇 번째로 왔는지로 추측하지 않는다
 * (sse-contract.md §전송 형식). 계약이 나중에 stage를 늘려도 여기서 죽지 않아야 한다.
 *
 * 현재 범위: 진입 화면 + 과정 로그 계층(search · found · read · trend).
 * judge(8-4) · paper_done(8-5) · retry/paper_failed(8-6) · empty/error/done(8-7)은
 * 분기만 뚫어두고 아래 TODO에서 채운다.
 */
(function () {
  "use strict";

  // ------------------------------------------------------------------ DOM
  const body = document.body;
  const form = document.getElementById("topic-form");
  const input = document.getElementById("topic-input");
  const starter = document.getElementById("starter");
  const timeline = document.getElementById("timeline");

  // ---------------------------------------------------------------- state
  /** 현재 열려 있는 이벤트 소스. 한 번에 하나만 돈다. */
  let source = null;

  /**
   * `read`에서 받은 정보를 논문 index별로 보관한다.
   *
   * `used_fulltext`는 도구 선택(2단계)이 사용자 눈에 보이는 유일한 지점인데,
   * 카드를 그리는 시점(`paper_done`)에도 같은 값이 오지만 판단 **사유**(`reason`)는
   * `read`에만 있다. 8-5에서 배지 옆에 사유를 붙일 수 있게 여기 남겨둔다.
   */
  const readInfo = new Map();

  // -------------------------------------------------------------- 렌더 도구

  /**
   * 타임라인에 항목 하나를 추가한다.
   *
   * 텍스트는 **항상 textContent로 넣는다.** 논문 제목·요약은 arXiv와 LLM에서 온
   * 외부 문자열이라 innerHTML로 넣으면 그대로 마크업이 된다.
   *
   * @param {string} modifier - `entry--log` 같은 상태 클래스
   * @returns {HTMLLIElement}
   */
  function appendEntry(modifier) {
    const stuck = isPinnedToBottom();

    const item = document.createElement("li");
    item.className = `entry ${modifier}`;
    timeline.appendChild(item);

    // 지켜보던 사용자는 계속 따라가게 하고, 위로 올려 읽던 사용자는 끌어내리지 않는다.
    if (stuck) item.scrollIntoView({ block: "end", behavior: "smooth" });

    return item;
  }

  /** 과정 로그 한 줄. 작고 흐리게 — 읽지 않고 훑고 지나가도 되는 계층이다. */
  function appendLog(text, detail) {
    const item = appendEntry("entry--log");
    item.textContent = text;

    if (detail !== undefined && detail !== "") {
      const span = document.createElement("span");
      span.className = "entry__detail";
      span.textContent = ` — ${detail}`;
      item.appendChild(span);
    }
    return item;
  }

  /**
   * 논문 목록 하나(제목 + 사유)를 만든다. picked와 excluded가 같은 모양을 쓴다.
   *
   * 제외 목록에도 **반드시 사유가 붙는다.** 제목만 나열하면 "놓치지 않기"라는
   * 이 서비스의 핵심 가치가 증명되지 않는다 — 연구자는 무엇을 골랐는지가 아니라
   * 무엇을 왜 버렸는지를 보고 신뢰한다.
   */
  function buildPaperList(papers) {
    const list = document.createElement("ul");
    list.className = "paper-list";

    for (const paper of papers) {
      const item = document.createElement("li");

      const title = document.createElement("span");
      title.className = "paper-list__title";
      title.textContent = paper.title;

      const reason = document.createElement("span");
      reason.className = "paper-list__reason";
      reason.textContent = paper.reason;

      item.append(title, reason);
      list.appendChild(item);
    }
    return list;
  }

  /**
   * `judge` — 이 서비스의 하이라이트 1. 과정 로그가 아니라 강조 블록이다.
   *
   * picked는 펼친 상태로, excluded는 "제외된 N편 보기"로 접어서 보여준다.
   * 펼침은 `<details>`로 충분하다 — JS 토글을 새로 발명하지 않는다.
   */
  function appendJudge(event) {
    const item = appendEntry("entry--judge");
    const excludedCount = event.total - event.selected;

    const heading = document.createElement("p");
    heading.className = "judge__heading";
    heading.textContent = "중요도 판단";

    const count = document.createElement("p");
    count.className = "judge__count";
    count.textContent =
      `${event.total}편 중 ${event.selected}편 선별 · ${excludedCount}편 제외`;

    item.append(heading, count);

    if (event.picked.length > 0) {
      item.appendChild(buildPaperList(event.picked));
    }

    // 0편이면 "제외된 0편 보기"라는 빈 버튼이 되므로 아예 만들지 않는다.
    if (event.excluded.length > 0) {
      const details = document.createElement("details");
      details.className = "disclosure judge__excluded";

      const summary = document.createElement("summary");
      summary.textContent = `제외된 ${event.excluded.length}편 보기 — 제외 사유 포함`;

      details.append(summary, buildPaperList(event.excluded));
      item.appendChild(details);
    }
  }

  /** 사용자의 스크롤이 사실상 맨 아래에 있는가. */
  function isPinnedToBottom() {
    const gap =
      document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
    return gap < 120;
  }

  // ------------------------------------------------------------ stage 분기

  /**
   * 이벤트 하나를 화면에 반영한다.
   *
   * 모르는 stage가 와도 **죽지 않고 무시한다.** 계약이 늘어났을 때 프론트가
   * 통째로 멈추면, 이미 그려둔 카드까지 못 쓰게 된다.
   */
  function render(event) {
    switch (event.stage) {
      // ── 과정 로그 계층 ────────────────────────────────────────────
      case "search":
        appendLog(`arXiv 검색 — '${event.topic}'`);
        break;

      case "found":
        appendLog(`${event.count}편 발견`);
        break;

      case "read": {
        readInfo.set(event.index, {
          used_fulltext: event.used_fulltext,
          reason: event.reason,
          title: event.title,
        });
        const how = event.used_fulltext ? "본문까지 읽는 중" : "초록으로 충분하다고 판단";
        appendLog(`논문 ${event.index}/${event.total} · ${event.title}`, how);
        break;
      }

      case "trend":
        appendLog("논문 간 연결점을 종합하는 중");
        break;

      // ── 아래는 분기만 뚫어둔다 ────────────────────────────────────
      case "judge":
        appendJudge(event);
        break;

      case "paper_done":
        // TODO(8-5 · #73): 3줄 요약 카드 + 배지 + 초록 펼침 + arXiv 링크
        break;

      case "retry":
        // TODO(8-6 · #74): 앰버 로그. 감추지 않는다
        break;

      case "paper_failed":
        // TODO(8-6 · #74): 타임라인 항목 + 원문 링크. 화면을 대체하지 않는다
        break;

      case "done":
      case "empty":
      case "error":
        // TODO(8-7 · #75): 종결 처리. **여기서 반드시 source.close()를 부른다.**
        // 지금은 목이라 재연결이 없지만, 실연결(8-8)에서 이게 빠지면
        // EventSource가 자동 재연결해 에이전트가 통째로 재실행된다.
        break;

      default:
        // 계약에 없는 stage. 무시하되 흔적은 남긴다.
        console.debug("[app] 모르는 stage:", event.stage, event);
    }
  }

  // ------------------------------------------------------------------ 실행

  /**
   * 이벤트 소스를 만든다.
   *
   * **8-8(#76)에서 바꾸는 곳은 이 함수 하나다.** `?mock=`이 없으면
   * `new EventSource("/api/brief/stream?topic=...")`를 돌려주게 된다.
   * 목과 실제가 같은 모양(`onmessage`에 JSON 문자열, `close()`)이라 호출부는 그대로다.
   */
  function createSource(topic) {
    const scenario = HubMock.scenarioFromQuery() ?? "normal";
    return new HubMock.MockEventSource(scenario);
  }

  function startRun(topic) {
    if (source !== null) source.close();

    timeline.replaceChildren();
    readInfo.clear();
    body.dataset.state = "running";

    source = createSource(topic);
    source.onmessage = (message) => {
      // 서버는 `data: {json}` 한 줄을 보내고, 브라우저는 그 JSON을 문자열로 준다.
      render(JSON.parse(message.data));
    };
  }

  // ------------------------------------------------------------- 진입 화면

  /**
   * 예시 주제 칩 → 입력창을 채운다.
   *
   * 칩마다 리스너를 다는 대신 상위에서 한 번 받는다(이벤트 위임).
   * `empty` 화면(8-7)도 같은 모양의 제안 칩을 동적으로 만들어 붙일 예정이라
   * 그때 리스너를 다시 달지 않아도 된다.
   */
  starter.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip === null) return;

    input.value = chip.dataset.topic;
    input.focus();
  });

  form.addEventListener("submit", (event) => {
    // 기본 동작(페이지 이동)을 막는다. 이 서비스는 한 페이지에서 상태만 바뀐다.
    event.preventDefault();

    const topic = input.value.trim();
    if (topic === "") return;

    startRun(topic);
  });

  // `?mock=`이 붙어 있으면 바로 재생한다 — 개발 중 새로고침마다 클릭하지 않도록.
  const scenario = HubMock.scenarioFromQuery();
  if (scenario !== null) {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get("topic") ?? "LLM agent planning";
    input.value = topic;
    startRun(topic);
  }
})();
