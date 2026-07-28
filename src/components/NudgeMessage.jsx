import { buildNudgeMessage } from "../lib/nudgeMessages";

// message.body는 여전히 nudgeMessages.js가 만든 문자열 그대로다(#20/#24 로직·테스트
// 영향 없음) — 화면 표시만 "핵심 문장"과 "추천 행동(microtask)"으로 나눠서 보여준다.
// body가 항상 microtask로 끝나는 현재 문장 구조를 이용해 마지막 등장 위치를 잘라낸다
// (Lv4는 body 자체가 이미 microtask를 포함하지 않으므로 그대로 lead로 쓰인다).
function splitLeadAndAction(body, microtask) {
  if (!microtask) return body;
  const idx = body.lastIndexOf(microtask);
  if (idx === -1) return body;
  const lead = body.slice(0, idx).trim();
  return lead.length > 0 ? lead : body;
}

// 레벨 칩 + 본문 (wireframe.md 4번의 NudgeMessage).
// 레벨별 문구는 nudgeMessages.js가 담당하고, 이 컴포넌트는 그 결과를 렌더링만 한다.
// Lv1~4 모두 실제 문구가 있다(#23~#27). 자리표시 문구는 빌더가 없는 레벨(Lv0)에만 남는다.
// completedTasks: Lv3 기억 기반 개입이 참조하는 세션 내 완료 이력.
// overrideMessage: 부모(NudgeModal)가 이미 고정해둔 메시지(Lv2 microTask 고정용)가
// 있으면 다시 계산하지 않고 그대로 사용한다.
function NudgeMessage({
  task,
  onStart,
  completedTasks = [],
  overrideMessage = null,
  isWaitingForReason = false,
  isGenerating = false,
  startDisabled = false,
}) {
  const message = isWaitingForReason || isGenerating
    ? null
    : overrideMessage ?? buildNudgeMessage(task.level, task, completedTasks);

  // microTask가 있는 레벨/상태(Lv2 생성·fallback, Lv3 이유 확인 이후, Lv4)에서만
  // "추천 행동"을 core 문장과 분리된 별도 줄로 보여준다. Lv1은 microtask가 없어 그대로 없음.
  const hasAction = Boolean(message?.microtask);
  const coreText = message
    ? hasAction
      ? splitLeadAndAction(message.body, message.microtask)
      : message.body
    : null;

  return (
    <div className="nudge-body">
      <p className="nudge-message">
        <strong>{task.title}</strong>
        {isWaitingForReason
          ? ", 지금 막는 이유부터 다시 확인하자."
          : isGenerating
            ? ", 지금 할 수 있는 첫 행동을 찾고 있어요…"
          : message
            ? `, ${coreText}`
            : ", 곧 이 레벨에 맞는 안내가 추가될 예정이에요."}
      </p>
      {task.level === 4 && message?.dday && (
        <p className="nudge-deadline-note">마감 {message.dday}</p>
      )}
      {hasAction && (
        <div className="nudge-action-block">
          <span className="nudge-action-label">추천 행동</span>
          <p className="nudge-action">
            <span className="nudge-action-arrow" aria-hidden="true">→</span>
            <span className="nudge-action-text">{message.microtask}</span>
          </p>
        </div>
      )}
      <div className="nudge-buttons">
        <button
          className="btn nudge-primary"
          onClick={onStart}
          disabled={startDisabled}
        >
          {isWaitingForReason
            ? "이유 확인하고 시작하기"
            : isGenerating
              ? "첫 행동 찾는 중…"
              : "지금 시작하기"}
        </button>
      </div>
    </div>
  );
}

export default NudgeMessage;
