import { LEVEL_META } from "../lib/levelMeta";
import { buildNudgeMessage } from "../lib/nudgeMessages";

// 레벨 칩 + 본문 (wireframe.md 4번의 NudgeMessage).
// 레벨별 문구는 nudgeMessages.js가 담당하고, 이 컴포넌트는 그 결과를 렌더링만 한다.
// Lv1~4 모두 실제 문구가 있다(#23~#27). 자리표시 문구는 빌더가 없는 레벨(Lv0)에만 남는다.
// completedTasks: Lv3 기억 기반 개입이 참조하는 세션 내 완료 이력.
function NudgeMessage({ task, onStart, completedTasks = [] }) {
  const meta = LEVEL_META[task.level];
  const message = buildNudgeMessage(task.level, task, completedTasks);

  return (
    <div className="nudge-body">
      <span className="nudge-chip">{meta.label}</span>
      <p className="nudge-message">
        <strong>{task.title}</strong>
        {message ? `, ${message.body}` : ", 곧 이 레벨에 맞는 안내가 추가될 예정이에요."}
      </p>
      <div className="nudge-buttons">
        <button className="btn nudge-primary" onClick={onStart}>
          지금 시작하기
        </button>
      </div>
    </div>
  );
}

export default NudgeMessage;
