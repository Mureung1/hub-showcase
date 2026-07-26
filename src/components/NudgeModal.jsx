import { useEffect, useState, useRef } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import {
  isLockedToStart,
  buildNudgeMessage,
  buildLv2NudgeMessage,
  buildLv3FallbackMessage,
  buildLv3MemoryNudgeMessage,
  buildLv3PersonalizedNudgeMessage,
} from "../lib/nudgeMessages";
import {
  requestLv2Microtask,
  requestLv3Microtask,
} from "../lib/microtaskApi";
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
  onLv2ActionResolved,
  lv2MicroTask = null,
  lv3ReasonChanged = null,
  onAddToCalendar,
  completedTasks = [],
}) {
  const meta = LEVEL_META[task.level];

  // Lv4(마감 임박)에서는 "지금 시작하기"만 남기고 닫기·체크포인트 등 다른 선택지를 잠근다.
  const lockedToStart = isLockedToStart(task.level);
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  const reconfirmInFlightRef = useRef(false);
  const [lv3RequestContext, setLv3RequestContext] = useState(() => {
    if (task.level !== 3 || checkpointLevel === 3) return null;
    return {
      reason: task.reason,
      customReason:
        task.reason === "custom" ? task.customReasonText : null,
      reasonChanged: lv3ReasonChanged,
      lv2MicroTask,
    };
  });

  // Gemini가 실패하거나 늦어도 즉시 돌아갈 수 있도록 기존 룰베이스 결과를 모달
  // 인스턴스당 한 번만 만들어 고정한다. 최종 선택 책임도 이 컴포넌트에만 둔다.
  const lv2FallbackRef = useRef(null);
  if (task.level === 2 && lv2FallbackRef.current === null) {
    lv2FallbackRef.current = buildNudgeMessage(2, task, completedTasks);
  }
  const [frozenLv2Message, setFrozenLv2Message] = useState(null);
  const isGeneratingLv2 =
    task.level === 2 && frozenLv2Message === null;

  // Lv3 서버 경로가 사용할 수 없을 때 즉시 돌아갈 유형별 fallback도 모달당
  // 한 번만 만든다.
  const lv3FallbackRef = useRef(null);
  if (task.level === 3 && lv3FallbackRef.current === null) {
    lv3FallbackRef.current = buildLv3FallbackMessage(task);
  }
  const [frozenLv3Message, setFrozenLv3Message] = useState(null);
  const frozenLv3MessageRef = useRef(null);
  const lv3RequestSequenceRef = useRef(0);
  const isGeneratingLv3 =
    task.level === 3 &&
    lv3RequestContext !== null &&
    frozenLv3Message === null;

  // Lv1/Lv4 룰베이스 메시지는 한 번만 만든다. 화면 표시와 Focus 전달은
  // 반드시 이 동일 객체를 사용한다.
  const frozenRuleMessageRef = useRef(undefined);
  if (
    task.level !== 2 &&
    task.level !== 3 &&
    frozenRuleMessageRef.current === undefined
  ) {
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
        const message = buildLv2NudgeMessage(
          task,
          microTask,
          generationSource,
        );
        setFrozenLv2Message(message);
        onLv2ActionResolved?.(task.id, message.microtask);
      })
      .catch(() => {
        if (!active) return;
        setFrozenLv2Message(lv2FallbackRef.current);
        onLv2ActionResolved?.(task.id, lv2FallbackRef.current.microtask);
      });

    return () => {
      active = false;
    };
  }, [task, onLv2ActionResolved]);

  useEffect(() => {
    if (
      task.level !== 3 ||
      lv3RequestContext === null ||
      frozenLv3MessageRef.current !== null
    ) {
      return undefined;
    }

    let active = true;
    const requestSequence = ++lv3RequestSequenceRef.current;
    const finalizeMessage = (message) => {
      if (
        !active ||
        requestSequence !== lv3RequestSequenceRef.current ||
        frozenLv3MessageRef.current !== null
      ) {
        return;
      }
      frozenLv3MessageRef.current = message;
      setFrozenLv3Message(message);
    };

    requestLv3Microtask({
      taskId: task.id,
      reason: lv3RequestContext.reason,
      customReason: lv3RequestContext.customReason,
      reasonChanged: lv3RequestContext.reasonChanged,
      lv2MicroTask: lv3RequestContext.lv2MicroTask,
      level: 3,
    })
      .then((result) => {
        if (result.status === "generated") {
          finalizeMessage(
            result.memoryEvidence
              ? buildLv3MemoryNudgeMessage(
                  result.microTask,
                  result.memoryEvidence,
                  lv3RequestContext.reason,
                )
              : buildLv3PersonalizedNudgeMessage(
                  result.microTask,
                  lv3RequestContext.reason,
                ),
          );
          return;
        }
        finalizeMessage(lv3FallbackRef.current);
      })
      .catch(() => {
        finalizeMessage(lv3FallbackRef.current);
      });

    return () => {
      active = false;
    };
  }, [
    task.id,
    task.level,
    lv3RequestContext,
  ]);

  const frozenMessage =
    task.level === 2
      ? frozenLv2Message
      : task.level === 3
        ? frozenLv3Message
        : frozenRuleMessageRef.current;
  const isGenerating = isGeneratingLv2 || isGeneratingLv3;
  const isWaitingForLv3Reason =
    task.level === 3 &&
    Boolean(checkpointLevel) &&
    !checkpointAnswered &&
    !lockedToStart;
  const hasValidMemoryEvidence =
    task.level === 3 &&
    frozenMessage?.generationSource === "gemini" &&
    typeof frozenMessage.memoryEvidence?.sourceDoneEventId === "string" &&
    frozenMessage.memoryEvidence.sourceDoneEventId.trim().length > 0;
  const labelOverride =
    task.level === 3
      ? hasValidMemoryEvidence
        ? "Lv3 · 이전 완료 기록 참고"
        : frozenMessage?.generationSource === "gemini"
          ? "Lv3 · 맞춤 첫 행동"
          : "Lv3 · 강화된 첫 행동"
      : null;

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

  // Lv4로 올라가면(레벨업으로 열렸든, Lv3 모달이 tick으로 올라갔든) 재확인도 잠근다.
  const showCheckpoint =
    Boolean(checkpointLevel) && !checkpointAnswered && !lockedToStart;

  async function handleReconfirm(reason, customText) {
    if (task.level !== 3) {
      setCheckpointAnswered(true);
      onReconfirmReason?.(reason, customText);
      return;
    }

    if (reconfirmInFlightRef.current || !onReconfirmReason) return;
    reconfirmInFlightRef.current = true;
    try {
      const savedReason = await onReconfirmReason(reason, customText);
      if (!savedReason) return;

      setCheckpointAnswered(true);
      if (task.level === 3) {
        setLv3RequestContext({
          reason: savedReason.reason,
          customReason:
            savedReason.reason === "custom"
              ? savedReason.customReasonText
              : null,
          reasonChanged: savedReason.reasonChanged ?? null,
          lv2MicroTask,
        });
      }
    } finally {
      reconfirmInFlightRef.current = false;
    }
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
          labelOverride={labelOverride}
          isWaitingForReason={isWaitingForLv3Reason}
          isGenerating={isGenerating}
          startDisabled={isWaitingForLv3Reason || isGenerating}
        />

        {task.level === 4 && (
          <CalendarSlotCard task={task} onAddToCalendar={onAddToCalendar} />
        )}
      </div>
    </div>
  );
}

export default NudgeModal;
