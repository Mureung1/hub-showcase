import { useState, useRef } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import { isLockedToStart, buildNudgeMessage } from "../lib/nudgeMessages";
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
  onAddToCalendar,
  completedTasks = [],
}) {
  const meta = LEVEL_META[task.level];

  // Lv4(마감 임박)에서는 "지금 시작하기"만 남기고 닫기·체크포인트 등 다른 선택지를 잠근다.
  const lockedToStart = isLockedToStart(task.level);

  // Lv2 microTask 고정: getMicrotask()가 내부적으로 랜덤 선택을 하므로, 다른 task의
  // tick으로 인한 부모 리렌더 등으로 이 컴포넌트가 다시 렌더돼도 매번 새 문구가
  // 나오지 않도록 이 모달 인스턴스(=같은 task.id) 안에서 한 번만 계산해 고정한다.
  // NudgeModal은 HomePage에서 key={modalTask.id}로 렌더되므로, task.id가 바뀌면
  // 인스턴스 자체가 새로 생겨 이 ref도 자연스럽게 초기화된다.
  const lv2MessageRef = useRef(null);
  if (task.level === 2 && lv2MessageRef.current === null) {
    lv2MessageRef.current = buildNudgeMessage(2, task, completedTasks);
  }
  const frozenLv2Message = task.level === 2 ? lv2MessageRef.current : null;

  // "지금 시작하기" → 고정된 Lv2 microTask를 포함한 focusSession을 그대로 Focus까지 전달한다.
  function handleStart() {
    if (task.level === 2 && frozenLv2Message) {
      onStart({
        taskId: task.id,
        title: task.title,
        startedAt: new Date().toISOString(),
        entryLevel: 2,
        microTask: frozenLv2Message.microtask,
        reason: task.reason,
      });
    } else {
      onStart();
    }
  }

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

        <NudgeMessage
          task={task}
          onStart={handleStart}
          completedTasks={completedTasks}
          overrideMessage={frozenLv2Message}
        />

        {task.level === 4 && (
          <CalendarSlotCard task={task} onAddToCalendar={onAddToCalendar} />
        )}
      </div>
    </div>
  );
}

export default NudgeModal;
