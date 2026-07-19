import { useState } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import ReasonCheckpoint from "./ReasonCheckpoint";
import "./NudgeModal.css";

// #14 최소 버전 넛지 모달: 레벨 표시 + "지금 시작하기"만.
// Lv1~4 차등 문구/마이크로태스크는 3주차 범위이므로 여기서 만들지 않는다.
// (문구는 레벨과 무관한 고정 템플릿 한 줄만 둔다.)
//
// checkpointLevel(1|3|null): 레벨이 1/3으로 처음 올라 회피 이유 재확인을 띄워야 하면
// 그 레벨, 아니면 null. onReconfirmReason: 재확인에서 이유를 고르면 호출된다(실제 DB
// 저장은 #22에서 연결 — 지금은 체크포인트를 접기만 한다).
function NudgeModal({ task, onStart, onClose, checkpointLevel, onReconfirmReason }) {
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

        <div className="nudge-body">
          <span className="nudge-chip">{meta.label}</span>
          <p className="nudge-message">
            <strong>{task.title}</strong>, 아직 시작 못 하셨네요. 지금 딱 한
            걸음만 떼어볼까요?
          </p>
          <div className="nudge-buttons">
            <button className="btn nudge-primary" onClick={onStart}>
              지금 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NudgeModal;
