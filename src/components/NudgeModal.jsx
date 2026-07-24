import { useEffect, useState, useRef } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import {
  isLockedToStart,
  buildNudgeMessage,
  buildLv2NudgeMessage,
} from "../lib/nudgeMessages";
import { requestLv2Microtask } from "../lib/microtaskApi";
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

  // Gemini가 실패하거나 늦어도 즉시 돌아갈 수 있도록 기존 룰베이스 결과를 모달
  // 인스턴스당 한 번만 만들어 고정한다. 최종 선택 책임도 이 컴포넌트에만 둔다.
  const lv2FallbackRef = useRef(null);
  if (task.level === 2 && lv2FallbackRef.current === null) {
    lv2FallbackRef.current = buildNudgeMessage(2, task, completedTasks);
  }
  const [frozenLv2Message, setFrozenLv2Message] = useState(null);
  const isGeneratingLv2 =
    task.level === 2 && frozenLv2Message === null;

  // Lv1/Lv3/Lv4도 룰베이스 빌더가 무작위 action을 고를 수 있으므로 한 번만 만든다.
  // 화면 표시와 Focus 전달은 반드시 이 동일 객체를 사용한다.
  const frozenRuleMessageRef = useRef(undefined);
  if (task.level !== 2 && frozenRuleMessageRef.current === undefined) {
    frozenRuleMessageRef.current = buildNudgeMessage(
      task.level,
      task,
      completedTasks,
    );
  }

  useEffect(() => {
    if (task.level !== 2) return undefined;

    let active = true;
    requestLv2Microtask({
      title: task.title,
      type: task.type,
      reason: task.reason,
      customReason:
        task.reason === "custom" ? task.customReasonText : null,
      level: 2,
    })
      .then(({ microTask, generationSource }) => {
        if (!active) return;
        setFrozenLv2Message(
          buildLv2NudgeMessage(task, microTask, generationSource),
        );
      })
      .catch(() => {
        if (!active) return;
        setFrozenLv2Message(lv2FallbackRef.current);
      });

    return () => {
      active = false;
    };
  }, [task]);

  const frozenMessage =
    task.level === 2 ? frozenLv2Message : frozenRuleMessageRef.current;

  // "지금 시작하기" → 화면에 고정해 표시한 action과 출처를 그대로 Focus까지 전달한다.
  function handleStart() {
    if (!frozenMessage) return;
    onStart({
      entryMode: "intervention",
      entryLevel: task.level,
      microTask: frozenMessage.microtask,
      generationSource: frozenMessage.generationSource,
      memoryEvidence: frozenMessage.memoryEvidence,
    });
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
          overrideMessage={frozenMessage}
          isGenerating={isGeneratingLv2}
          startDisabled={isGeneratingLv2}
        />

        {task.level === 4 && (
          <CalendarSlotCard task={task} onAddToCalendar={onAddToCalendar} />
        )}
      </div>
    </div>
  );
}

export default NudgeModal;
