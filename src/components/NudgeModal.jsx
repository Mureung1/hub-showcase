import { useState } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import ReasonCheckpoint from "./ReasonCheckpoint";
import NudgeMessage from "./NudgeMessage";
import FreeTextPrompt from "./FreeTextPrompt";
import "./NudgeModal.css";

// #23부터 레벨별 문구(NudgeMessage)로 교체 — 레벨 칩+본문은 NudgeMessage.jsx가 담당한다.
// #24부터 Lv2에서만 FreeTextPrompt(공감용 자유 텍스트, 로직 미반영)를 함께 띄운다.
//
// checkpointLevel(1|3|null): 레벨이 1/3으로 처음 올라 회피 이유 재확인을 띄워야 하면
// 그 레벨, 아니면 null. onReconfirmReason: 재확인에서 이유를 고르면 호출된다(실제 DB
// 저장은 #22에서 연결 — 지금은 체크포인트를 접기만 한다).
function NudgeModal({
  task,
  onStart,
  onClose,
  checkpointLevel,
  onReconfirmReason,
  completedTasks = [],
}) {
  const meta = LEVEL_META[task.level];

  // 재확인에 응답하면 체크포인트를 접고 평소 넛지 메시지로 넘어간다.
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  const showCheckpoint = Boolean(checkpointLevel) && !checkpointAnswered;

  function handleReconfirm(reason, customText) {
    setCheckpointAnswered(true);
    onReconfirmReason?.(reason, customText);
  }

  return (
    <div
      className="nudge-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="잔소리봇 개입"
    >
      <div className="nudge-content" data-level={task.level}>
        <div className="nudge-top">
          <span className="nudge-avatar" aria-hidden="true">
            {meta.face}
          </span>
          <span className="nudge-name">잔소리봇</span>
          <button className="nudge-close" onClick={onClose}>
            닫기 ✕
          </button>
        </div>

        <div className="nudge-status">벌써 {task.skipCount}번째 알림이에요.</div>

        {showCheckpoint && (
          <ReasonCheckpoint level={checkpointLevel} onSelect={handleReconfirm} />
        )}

        {task.level === 2 && <FreeTextPrompt />}

        <NudgeMessage task={task} onStart={onStart} completedTasks={completedTasks} />
      </div>
    </div>
  );
}

export default NudgeModal;
