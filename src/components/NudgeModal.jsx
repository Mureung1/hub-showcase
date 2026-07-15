import { LEVEL_META } from "../lib/levelMeta";
import "./NudgeModal.css";

// #14 최소 버전 넛지 모달: 레벨 표시 + "지금 시작하기"만.
// Lv1~4 차등 문구/마이크로태스크는 3주차 범위이므로 여기서 만들지 않는다.
// (문구는 레벨과 무관한 고정 템플릿 한 줄만 둔다.)
function NudgeModal({ task, onStart, onClose }) {
  const meta = LEVEL_META[task.level];

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
