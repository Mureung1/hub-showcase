import { useEffect, useState, useRef } from "react";
import { LEVEL_META } from "../lib/levelMeta";
import {
  buildNudgeMessage,
  buildLv2NudgeMessage,
  buildLv3FallbackMessage,
  buildLv3MemoryNudgeMessage,
  buildLv3PersonalizedNudgeMessage,
  NUDGE_TOP_STATUS_BY_LEVEL,
} from "../lib/nudgeMessages";
import {
  requestLv2Microtask,
  requestLv3Microtask,
} from "../lib/microtaskApi";
import ReasonCheckpoint from "./ReasonCheckpoint";
import NudgeMessage from "./NudgeMessage";
import FreeTextPrompt from "./FreeTextPrompt";
import nagbotLv1 from "../assets/characters/nagbot_lv1.png";
import nagbotLv2 from "../assets/characters/nagbot_lv2.png";
import nagbotLv3 from "../assets/characters/nagbot_lv3.png";
import nagbotLv4 from "../assets/characters/nagbot_lv4.png";
import "./NudgeModal.css";

const NUDGE_CHARACTER_BY_LEVEL = {
  1: nagbotLv1,
  2: nagbotLv2,
  3: nagbotLv3,
  4: nagbotLv4,
};

// 무응답 30초 후 자동으로 모달을 닫는다(사용자 활동으로 멈추거나 초기화되지 않음 —
// 모달이 열린 시점부터 연속 30초). 자동 종료는 onClose와 완전히 동일하게 처리해
// (API 호출 없음, 다음 알림 타이머는 부모가 정상 재예약) 새 이벤트/레벨 변경을 만들지 않는다.
export const NUDGE_AUTO_CLOSE_MS = 30_000;

function formatAutoCloseCountdown(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

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
  completedTasks = [],
}) {
  const meta = LEVEL_META[task.level];
  const isLv4 = task.level === 4;
  const [checkpointAnswered, setCheckpointAnswered] = useState(false);
  const reconfirmInFlightRef = useRef(false);

  // 자동 닫힘 30초 카운트다운 — 모달이 처음 열린 시점 기준 고정 마감(deadline)이라
  // 이유 선택/입력 등 어떤 모달 내부 상호작용에도 멈추거나 초기화되지 않는다.
  const autoCloseDeadlineRef = useRef(null);
  if (autoCloseDeadlineRef.current === null) {
    autoCloseDeadlineRef.current = Date.now() + NUDGE_AUTO_CLOSE_MS;
  }
  const [autoCloseRemainingMs, setAutoCloseRemainingMs] = useState(
    NUDGE_AUTO_CLOSE_MS,
  );
  const autoCloseIntervalRef = useRef(null);

  useEffect(() => {
    autoCloseIntervalRef.current = setInterval(() => {
      const remaining = autoCloseDeadlineRef.current - Date.now();
      if (remaining <= 0) {
        clearInterval(autoCloseIntervalRef.current);
        autoCloseIntervalRef.current = null;
        setAutoCloseRemainingMs(0);
        // 자동 종료는 X/onClose와 완전히 동일하다 — API 호출 없이 모달만 닫고,
        // 다음 알림 타이머 재예약은 부모(HomePage)의 onClose 처리에 맡긴다.
        onClose();
        return;
      }
      setAutoCloseRemainingMs(remaining);
    }, 1000);

    return () => {
      clearInterval(autoCloseIntervalRef.current);
      autoCloseIntervalRef.current = null;
    };
  }, [onClose]);

  // X/"지금 시작하기" 등 사용자가 직접 닫는 경우에는 자동 닫힘 interval을 즉시
  // 정리한다(unmount 시 effect cleanup으로도 정리되지만, onClose/onStart를 호출한
  // 직후 부모가 아직 unmount하지 않은 순간에 타이머가 한 번 더 도는 경우를 막기 위함).
  function clearAutoCloseTimer() {
    if (autoCloseIntervalRef.current) {
      clearInterval(autoCloseIntervalRef.current);
      autoCloseIntervalRef.current = null;
    }
  }

  function handleManualClose() {
    clearAutoCloseTimer();
    onClose();
  }
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
        if (result.status !== "generated") {
          finalizeMessage(lv3FallbackRef.current);
          return;
        }
        if (result.generationSource === "gemini") {
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
        // 서버가 200 + source:"rule_based"로 응답한 경우(Gemini 실패 시 서버 fallback) —
        // "지난 완료 기록 참고"/"맞춤 제안" 같은 gemini 전용 문구는 붙이지 않되,
        // 서버가 고른 microTask는 그대로 쓴다(클라이언트 테이블을 다시 계산해 값이
        // 갈라지지 않게 함). 요청 자체가 실패했을 때만(.catch) 진짜 클라이언트
        // fallback(lv3FallbackRef)로 넘어간다.
        finalizeMessage(
          buildLv3FallbackMessage(
            { type: task.type, skipCount: task.skipCount },
            result.microTask,
          ),
        );
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
    task.type,
    task.skipCount,
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
    !isLv4;
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
  const levelLabel = labelOverride ?? meta.label;
  const characterSrc = NUDGE_CHARACTER_BY_LEVEL[task.level];

  // "지금 시작하기" → 화면에 고정해 표시한 action과 출처를 그대로 Focus까지 전달한다.
  function handleStart() {
    if (!frozenMessage) return;
    clearAutoCloseTimer();
    onStart({
      entryMode: "intervention",
      entryLevel: task.level,
      journeyLevel: task.level,
      microTask: frozenMessage.microtask,
      generationSource: frozenMessage.generationSource,
      memoryEvidence: frozenMessage.memoryEvidence,
    });
  }

  // Lv4로 올라가면(레벨업으로 열렸든, Lv3 모달이 tick으로 올라갔든) 재확인도 잠근다.
  const showCheckpoint =
    Boolean(checkpointLevel) && !checkpointAnswered && !isLv4;

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
          <span className="nudge-name">잔소리봇</span>
          <div className="nudge-top-right">
            <span className="nudge-countdown" aria-live="off">
              <span className="nudge-countdown-label">자동 닫힘</span>{" "}
              <span className="nudge-countdown-value">
                {formatAutoCloseCountdown(autoCloseRemainingMs)}
              </span>
            </span>
            <button
              className="nudge-close"
              onClick={handleManualClose}
              aria-label="이번 알림 닫기"
              title="이번 알림 닫기"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="nudge-meta">
          <span className="nudge-chip">{levelLabel}</span>
          <span className="nudge-status">{NUDGE_TOP_STATUS_BY_LEVEL[task.level]}</span>
        </div>

        <div className="nudge-main">
          <div className="nudge-character-panel">
            <img
              className={`nudge-character nudge-character-lv${task.level}`}
              src={characterSrc}
              alt=""
              aria-hidden="true"
            />
          </div>

          <div className="nudge-interaction">
            {showCheckpoint && (
              <ReasonCheckpoint
                level={checkpointLevel}
                onSelect={handleReconfirm}
              />
            )}

            {task.level === 2 && <FreeTextPrompt />}

            <NudgeMessage
              task={task}
              onStart={handleStart}
              completedTasks={completedTasks}
              overrideMessage={frozenMessage}
              isWaitingForReason={isWaitingForLv3Reason}
              isGenerating={isGenerating}
              startDisabled={isWaitingForLv3Reason || isGenerating}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default NudgeModal;
