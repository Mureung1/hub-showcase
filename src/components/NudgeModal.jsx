import { useState } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import { isLockedToStart } from "../lib/nudgeMessages";
import ReasonCheckpoint from "./ReasonCheckpoint";
import NudgeMessage from "./NudgeMessage";
import FreeTextPrompt from "./FreeTextPrompt";
import CalendarSlotCard from "./CalendarSlotCard";
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

  // Lv4(마감 임박)에서는 "지금 시작하기"만 남기고 닫기·체크포인트 등 다른 선택지를 잠근다.
  const lockedToStart = isLockedToStart(task.level);

  // 재확인에 응답하면 체크포인트를 접고 평소 넛지 메시지로 넘어간다.
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  // Lv4로 올라가면(레벨업으로 열렸든, Lv3 모달이 tick으로 올라갔든) 재확인도 잠근다.
  const showCheckpoint =
    Boolean(checkpointLevel) && !checkpointAnswered && !lockedToStart;

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
          {!lockedToStart && (
            <button className="nudge-close" onClick={onClose}>
              닫기 ✕
            </button>
          )}
        </div>

        <div className="nudge-status">벌써 {task.skipCount}번째 알림이에요.</div>

        {showCheckpoint && (
          <ReasonCheckpoint level={checkpointLevel} onSelect={handleReconfirm} />
        )}

        {task.level === 2 && <FreeTextPrompt />}

        <NudgeMessage task={task} onStart={onStart} completedTasks={completedTasks} />

        {task.level === 4 && <CalendarSlotCard task={task} />}
      </div>
    </div>
  );
}

export default NudgeModal;
