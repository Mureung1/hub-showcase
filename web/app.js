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
  const fatal = document.getElementById("fatal");
  const fatalMessage = document.getElementById("fatal-message");
  const fatalMeta = document.getElementById("fatal-meta");
  const fatalRestart = document.getElementById("fatal-restart");

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

  /**
   * 요약의 3키는 **순서와 자리가 고정이다.** 자유 문단으로 바꾸지 않는다.
   *
   * 값이 비어 있어도 줄을 지운다거나 접지 않는다 — 카드마다 줄 수가 달라지면
   * 세로로 훑을 때 같은 정보가 같은 높이에 오지 않아 눈으로 비교할 수 없게 된다.
   * 그게 이 서비스가 요약을 3줄로 못박은 이유다.
   */
  const SUMMARY_ROWS = [
    ["contribution", "기여"],
    ["method", "방법"],
    ["result", "결과"],
  ];

  /**
   * `paper_done` — 이 서비스의 결과물. 논문 1편이 끝날 때마다 카드 하나를 즉시 붙인다.
   * 모아뒀다 마지막에 그리지 않는다: 사용자는 3분을 기다리는 게 아니라 30초마다 뭔가를 얻어야 한다.
   */
  function appendPaperCard(event) {
    const item = appendEntry("entry--card");
    item.id = `paper-${event.index}`; // 트렌드의 논문 칩이 여기로 스크롤한다 (Week 4)

    // ── 머리: 배지 + 메타 ──
    // 배지는 도구 선택(2단계)이 사용자 눈에 보이는 유일한 지점이라 생략하지 않는다.
    const head = document.createElement("div");
    head.className = "card__head";

    const badge = document.createElement("span");
    badge.className = event.used_fulltext ? "badge badge--fulltext" : "badge badge--abstract";
    badge.textContent = event.used_fulltext ? "본문까지 읽음" : "초록으로 충분";

    // 왜 그렇게 판단했는지는 read 이벤트에만 있다 — 8-3에서 받아둔 것을 꺼내 쓴다.
    const decided = readInfo.get(event.index);
    if (decided !== undefined && decided.reason) badge.title = decided.reason;

    const meta = document.createElement("span");
    meta.className = "entry__meta";
    meta.textContent = `arXiv ${event.arxiv_id} · ${event.date}`;

    head.append(badge, meta);

    // 스스로 점검했다는 흔적. 성공한 카드에도 남긴다 — 감추면 자기 검증이 없던 일이 된다.
    if (event.retried > 0) {
      const retried = document.createElement("span");
      retried.className = "card__retried";
      retried.textContent = `자기 검증 후 ${event.retried}회 보완`;
      head.appendChild(retried);
    }

    // ── 제목 ──
    const title = document.createElement("h2");
    title.className = "entry__title";
    title.textContent = event.title;

    // ── 3줄 요약 ──
    const summary = document.createElement("dl");
    summary.className = "summary";
    for (const [key, label] of SUMMARY_ROWS) {
      const term = document.createElement("dt");
      term.textContent = label;

      const value = document.createElement("dd");
      const text = event.summary[key];
      if (text) {
        value.textContent = text;
      } else {
        // 자리는 유지하되 비었다는 사실은 숨기지 않는다.
        value.textContent = "요약하지 못했습니다";
        value.classList.add("summary__missing");
      }
      summary.append(term, value);
    }

    // ── 근거: 원문 초록 + arXiv 링크 ──
    // 요약을 원문과 대조할 수 없으면 연구자는 요약을 믿지 않는다. 초록은 필수다.
    const foot = document.createElement("div");
    foot.className = "card__foot";

    const abstract = document.createElement("details");
    abstract.className = "disclosure";
    const abstractSummary = document.createElement("summary");
    abstractSummary.textContent = "원문 초록 펼치기";
    const abstractBody = document.createElement("p");
    abstractBody.className = "card__abstract";
    abstractBody.textContent = event.abstract;
    abstract.append(abstractSummary, abstractBody);

    const link = document.createElement("a");
    link.className = "card__link";
    link.href = event.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "arXiv 원문 ↗";

    foot.append(abstract, link);

    item.append(head, title, summary, foot);
  }

  /**
   * `paper_failed` — 부분 실패. **정상적인 결말이지 에러가 아니다.**
   *
   * 타임라인 안의 항목 하나로 남긴다. 화면을 대체하거나 앞의 카드를 지우지 않는다 —
   * 4편 중 3편 성공은 흔한 일이고, 여기서 전체 에러를 띄우면 이미 만든 3편과
   * 거기 든 3분·API 비용을 통째로 버리게 된다.
   *
   * `url`은 반드시 붙인다. AI가 못 읽었으면 사람이 읽으면 된다 —
   * 막다른 길로 끝내지 않는다.
   */
  function appendPaperFailed(event) {
    const item = appendEntry("entry--failed");

    const heading = document.createElement("p");
    heading.className = "failed__heading";
    heading.textContent = `${event.index}편째 — 요약하지 못했습니다`;

    const title = document.createElement("p");
    title.className = "failed__title";
    title.textContent = event.title;

    const reason = document.createElement("p");
    reason.className = "failed__reason";
    reason.textContent = event.reason;

    const link = document.createElement("a");
    link.className = "card__link";
    link.href = event.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "원문에서 직접 확인 ↗";

    item.append(heading, title, reason, link);
  }

  // ---------------------------------------------------------- 종결 처리

  /**
   * 스트림을 끝낸다. **반드시 close()를 부른다.**
   *
   * 안 부르면 EventSource가 자동 재연결하고 → 에이전트가 통째로 재실행되고 →
   * API 비용이 탄다. SSE 스트림이 끝나는 것과 TCP 연결이 닫히는 것은 다른 일이라
   * "서버가 끝냈으니 알아서 닫히겠지"는 성립하지 않는다.
   */
  function finish(state) {
    body.dataset.state = state;

    if (source !== null) {
      source.close();
      source = null;
    }
  }

  /**
   * 결과 없음 — **에러가 아니다.** 중립 톤으로 그리고 다음 행동을 준다.
   *
   * 두 경로가 여기로 온다:
   *   1. `empty`      — 검색 자체가 0편
   *   2. `done`인데 `stats.selected === 0` — 검색은 됐지만 판단에서 전부 걸러진 경우 (#79)
   * 둘 다 "에이전트는 정상 작동했고, 맞는 논문이 없었다"는 같은 사실을 말한다.
   */
  function appendNoResult(scanned, suggestions) {
    const item = appendEntry("entry--neutral");

    const heading = document.createElement("p");
    heading.className = "neutral__heading";
    heading.textContent = "주제와 맞는 논문을 찾지 못했습니다";

    const detail = document.createElement("p");
    detail.className = "neutral__detail";
    detail.textContent =
      scanned > 0
        ? `${scanned}편을 훑었지만 주제와 맞는 논문은 없었습니다. 에이전트는 정상 작동했습니다.`
        : "검색 결과가 0편이었습니다. 에이전트는 정상 작동했습니다.";

    item.append(heading, detail);

    // 막다른 길로 끝내지 않는다. 검색어를 좁게 잡는 건 사용자 잘못이 아니라 흔한 일이다.
    //
    // 서버의 `suggestions`는 현재 항상 빈 배열이라(#77) 그대로 두면 제안이 사라진다.
    // 비어 있으면 진입 화면의 예시 주제를 대신 쓴다 — 제안의 품질은 낮아도
    // "다음에 할 수 있는 행동이 화면에 있어야 한다"는 규칙은 지켜진다.
    const topics =
      Array.isArray(suggestions) && suggestions.length > 0
        ? suggestions
        : [...starter.querySelectorAll(".chip")].map((chip) => chip.dataset.topic);

    if (topics.length > 0) {
      const label = document.createElement("p");
      label.className = "neutral__suggest-label";
      label.textContent = "이렇게 해보세요";

      const chips = document.createElement("div");
      chips.className = "neutral__chips";
      for (const topic of topics) {
        const chip = document.createElement("button");
        chip.className = "chip";
        chip.type = "button";
        chip.dataset.topic = topic;
        chip.textContent = topic;
        chips.appendChild(chip);
      }
      item.append(label, chips);
    }
  }

  /**
   * 흐름 하나(제목 + 본문)를 만든다. `gap`도 같은 모양을 쓴다.
   *
   * gap을 따로 떼지 않는 이유: 떼면 부록처럼 보인다. 연구자에게 트렌드의 가치는
   * 무엇이 유행인가보다 **무엇이 비어 있는가**라서, 흐름들과 같은 번호를 달고
   * 같은 목록에 들어가야 한다 (wireframe_done.svg의 `3 · 아직 비어 있는 곳`).
   *
   * 번호는 `<ol>`이 매긴다 — JS로 문자열에 박으면 항목이 빠질 때 번호가 어긋난다.
   */
  function buildFlow(title, bodyText, modifier) {
    const item = document.createElement("li");
    item.className = modifier === undefined ? "trend__flow" : `trend__flow ${modifier}`;

    const heading = document.createElement("p");
    heading.className = "trend__flow-title";
    heading.textContent = title;

    const paragraph = document.createElement("p");
    paragraph.className = "trend__flow-body";
    paragraph.textContent = bodyText;

    item.append(heading, paragraph);
    return item;
  }

  /**
   * `done.trend` — 5단계(트렌드 추론)의 결과물. **타임라인의 마지막에 붙는다.**
   *
   * 맨 위로 올리지 않는다. 작업을 지켜본 사용자의 스크롤은 이미 맨 아래에 있고,
   * 트렌드가 거기 도착하는 것이 시간순이라는 사실도 지킨다(wireframe_done.svg 주석).
   * 위로 올라갔거나 나중에 들어온 사용자를 위해서는 대신 **상단 헤더를 고정한다**(9-3).
   * 둘은 한 쌍이라, 트렌드를 아래에 두는 결정은 헤더 없이는 성립하지 않는다.
   *
   * 과정 로그("논문 간 연결점을 종합하는 중")는 덮지도 지우지도 않는다 — 감사 기록이다.
   *
   * 논문 칩(`flows[].papers`)은 9-2에서 붙인다. 여기서는 읽지 않는다.
   *
   * @param {{flows: Array<object>, gap: ?string}} trend - `done.trend`
   * @param {number} succeeded - 카드가 그려진 논문 수. 헤딩의 "N편"이 된다
   */
  function appendTrend(trend, succeeded) {
    // 계약상 `gap`은 null일 수 있고, fallback으로 `flows`가 빈 배열일 수도 있다.
    // 서버가 보낸 모양을 그대로 믿지 않고 여기서 한 번 좁힌다.
    const payload = trend === null || trend === undefined ? {} : trend;
    const flows = Array.isArray(payload.flows) ? payload.flows : [];
    const gap = typeof payload.gap === "string" ? payload.gap.trim() : "";

    // 흐름도 gap도 없으면 **블록 자체를 만들지 않는다.**
    // `agent.py`의 fallback이 `{"flows": [], "gap": None}`이라 실제로 도달하는 경로다.
    // 제목만 덩그러니 남으면 사용자는 에이전트가 고장난 것으로 읽는다.
    // 시도했다는 기록은 과정 로그에 이미 남아 있으므로 여기서 침묵해도 잃는 것이 없다.
    if (flows.length === 0 && gap === "") return;

    const item = appendEntry("entry--trend");

    const heading = document.createElement("p");
    heading.className = "trend__heading";
    heading.textContent = `${succeeded}편을 관통하는 흐름`;

    const subheading = document.createElement("p");
    subheading.className = "trend__subheading";
    subheading.textContent = "에이전트가 논문들을 서로 연결해 정리했습니다";

    const list = document.createElement("ol");
    list.className = "trend__flows";

    for (const flow of flows) {
      list.appendChild(buildFlow(flow.title, flow.body));
    }

    if (gap !== "") {
      list.appendChild(buildFlow("아직 비어 있는 곳", gap, "trend__flow--gap"));
    }

    item.append(heading, subheading, list);
  }

  /**
   * `done` — 정상 종결.
   *
   * **진행 로그를 지우거나 초기화하지 않는다.** 로그는 감사 기록이라 완료 후에도 남는다.
   * 트렌드 블록을 붙인 뒤 종결 로그로 끝낸다. 상단 완료 헤더는 9-3 범위다.
   *
   * @returns {string} 화면에 실제로 그린 것에 맞는 상태 이름
   */
  function appendDone(event) {
    const { scanned, selected, succeeded, failed } = event.stats;

    // 선별 0편이면 성공도 실패도 아닌 "결과 없음"이다 (#79).
    // '0/0편 완료'는 아무 의미도 아니고, 사용자는 고장난 줄 안다.
    //
    // 이때 상태도 done이 아니라 empty로 둔다. 화면에 결과가 없는데 상태만
    // done이면, 이 상태를 보고 그리는 Week 4의 완료 헤더가 "0/0편"을 띄우게 된다.
    if (selected === 0) {
      appendNoResult(scanned, []);
      return "empty";
    }

    // 트렌드가 먼저, 종결 로그가 마지막이다. 트렌드는 `done`이 실어 온 결과물이고
    // 종결 로그는 "여기서 끝났다"는 표시라, 순서가 뒤집히면 끝난 뒤에 결과가 나온다.
    appendTrend(event.trend, succeeded);

    const parts = [`브리핑 완료 · ${succeeded}/${selected}편`];
    if (failed > 0) parts.push(`${failed}편은 요약하지 못했습니다`);
    appendLog(parts[0], parts[1]);
    return "done";
  }

  /**
   * `error` — 전체 실패.
   *
   * 계약상 **아무것도 못 건진 경우에만** 온다. 그럴 때만 화면을 대체한다.
   *
   * 다만 카드가 이미 그려진 뒤에 `error`가 도착할 수 있다 — agent.py의 trend/done
   * 조립부에 예외 보호가 없기 때문이다(#65). 그때 화면을 갈아엎으면 이미 얻은
   * 결과를 통째로 버리게 되므로, 여기서는 타임라인 항목으로만 남긴다.
   * **이건 #65를 고친 게 아니라 피해를 막는 것이다** — 원인은 백엔드에 남아 있다.
   */
  function appendError(event) {
    const salvaged = timeline.querySelector(".entry--card") !== null;

    if (salvaged) {
      console.warn(
        "[app] paper_done이 나간 뒤 error가 도착했다 — 계약 위반(#65). " +
          "이미 그린 카드를 지키기 위해 화면을 대체하지 않는다.",
        event
      );

      const item = appendEntry("entry--failed");
      const heading = document.createElement("p");
      heading.className = "failed__heading";
      heading.textContent = "도중에 중단되었습니다";

      const message = document.createElement("p");
      message.className = "failed__reason";
      message.textContent = `${event.message} (${event.code})`;

      item.append(heading, message);
      finish("done");
      return;
    }

    fatalMessage.textContent = event.message;
    // code는 작게 남긴다. 타겟이 개발자라 이게 오히려 친절하고 디버깅에도 필요하다.
    fatalMeta.textContent = [event.at, event.code].filter(Boolean).join(" · ");
    fatal.hidden = false;
    finish("error");
  }

  /** 어느 상태에서든 ① 진입 화면으로 되돌아갈 수 있어야 한다. */
  function resetToIdle() {
    if (source !== null) {
      source.close();
      source = null;
    }
    timeline.replaceChildren();
    readInfo.clear();
    fatal.hidden = true;
    body.dataset.state = "idle";
    input.focus();
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
        appendPaperCard(event);
        break;

      case "retry": {
        // 하이라이트 2. 스스로 점검했다는 증거이므로 감추지 않는다.
        // 앰버는 "고장"이 아니라 "정상 작동 중 주의"의 톤이다 — 빨강을 쓰지 않는다.
        const item = appendEntry("entry--retry");
        item.textContent = `요약 보완 중 (${event.attempt}회)`;

        const detail = document.createElement("span");
        detail.className = "entry__detail";
        detail.textContent = ` — 스스로 검증한 결과: ${event.feedback}`;
        item.appendChild(detail);
        break;
      }

      case "paper_failed":
        appendPaperFailed(event);
        break;

      // ── 종결 이벤트 3종. 셋을 서로 다르게 처리한다 ──────────────────
      case "done":
        // 화면에 무엇을 그렸는지에 따라 상태가 갈린다 (선별 0편이면 "결과 없음").
        finish(appendDone(event));
        break;

      case "empty":
        // 검색이 0편. 에이전트는 정상 작동해서 '없다'는 사실을 알아냈다.
        appendNoResult(event.scanned, event.suggestions);
        finish("empty");
        break;

      case "error":
        appendError(event);
        break;

      default:
        // 계약에 없는 stage. 무시하되 흔적은 남긴다.
        console.debug("[app] 모르는 stage:", event.stage, event);
    }
  }

  // ------------------------------------------------------------------ 실행

  /**
   * 개발 중 기본 논문 수. 무료 티어 한도가 금방 차므로 작게 둔다 (CLAUDE.md).
   * 논문 1편당 LLM을 4회 이상 부르므로 3편이면 이미 14회쯤 된다.
   */
  const DEFAULT_LIMIT = 3;

  /**
   * 이벤트 소스를 만든다. **목과 실제가 갈리는 유일한 지점이다.**
   *
   * `?mock=`이 붙어 있으면 목 재생기, 없으면 실제 서버에 붙는다.
   * 목 경로를 지우지 않는 이유는, 백엔드 없이 화면을 고칠 수 있는 능력이
   * 이후에도 계속 필요하기 때문이다(데모 리허설·프론트 수정·오프라인 작업).
   *
   * 둘의 인터페이스가 같아서(`onmessage`에 JSON 문자열, `close()`) 호출부는
   * 어느 쪽인지 알 필요가 없다.
   */
  function createSource(topic) {
    const scenario = HubMock.scenarioFromQuery();
    if (scenario !== null) return new HubMock.MockEventSource(scenario);

    const params = new URLSearchParams(window.location.search);
    const limit = params.get("limit") ?? String(DEFAULT_LIMIT);

    // **반드시 GET + 쿼리스트링이다.** EventSource는 POST를 지원하지 않는다.
    const query = new URLSearchParams({ topic, limit });
    return new EventSource(`/api/brief/stream?${query}`);
  }

  function startRun(topic) {
    if (source !== null) source.close();

    timeline.replaceChildren();
    readInfo.clear();
    fatal.hidden = true;
    body.dataset.state = "running";

    source = createSource(topic);

    source.onmessage = (message) => {
      // 서버는 `data: {json}` 한 줄을 보내고, 브라우저는 그 JSON을 문자열로 준다.
      render(JSON.parse(message.data));
    };

    /**
     * 연결이 끊겼다. **여기서 반드시 끝내야 한다.**
     *
     * EventSource는 연결이 끊기면 기본적으로 자동 재연결한다. 이 엔드포인트는
     * 붙을 때마다 에이전트를 처음부터 다시 돌리므로, 서버가 죽은 상태로 두면
     * 몇 초 간격으로 전체 실행이 반복되며 LLM 호출 한도가 빠르게 소진된다.
     *
     * 종결 이벤트를 이미 받았다면 close() 뒤에 오는 잡음이므로 무시한다.
     */
    source.onerror = () => {
      if (body.dataset.state !== "running") return;

      appendError({
        message: "서버와의 연결이 끊겼습니다. 서버가 실행 중인지 확인한 뒤 다시 시도해 주세요.",
        code: "connection_lost",
        at: `'${topic}' 브리핑 중`,
      });
    };
  }

  // ------------------------------------------------------------- 진입 화면

  /**
   * 주제 칩 → 입력창을 채운다. 진입 화면의 예시 칩과 결과 없음 화면의 제안 칩이
   * 같은 리스너를 쓴다 — 제안 칩은 나중에 동적으로 만들어지므로 문서 단위로 위임한다.
   *
   * 이미 한 번 돌린 뒤라면 칩 클릭이 곧 재시작이다. 결과 없음 화면에서는
   * 입력창이 접혀 있어, 채우기만 하면 사용자가 다음 행동을 할 수 없다.
   */
  document.addEventListener("click", (event) => {
    const chip = event.target.closest(".chip");
    if (chip === null) return;

    input.value = chip.dataset.topic;

    if (body.dataset.state === "idle") {
      input.focus();
    } else {
      startRun(chip.dataset.topic);
    }
  });

  fatalRestart.addEventListener("click", resetToIdle);

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
