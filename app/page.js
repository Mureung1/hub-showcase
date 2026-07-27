"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import BrainDumpInput from "./components/BrainDumpInput";
import TaskPreview from "./components/TaskPreview";
import OneFocusView from "./components/OneFocusView";
import FocusTimer from "./components/FocusTimer";
import CompleteScreen from "./components/CompleteScreen";
import RestSuggestion from "./components/RestSuggestion";
import ReasonChips from "./components/ReasonChips";
import ProposalCard from "./components/ProposalCard";

// "input" -> "preview" -> "focus" -> "timer" -> "complete"
// "focus" 중 "나 지금 힘들어" -> "reason" -> "proposal" -> (수락 시 tool별로 분기) / (거절 시 "proposal" 재판단)
// 새로고침 내구성(C04)에 쓰는 localStorage 키. step/currentIndex/microsteps/stepStartedAt만
// 저장한다 - "reason"/"proposal"(힘들어 루프 중) 화면을 다시 그리는 데 필요한 정보(reasonChip,
// 제안 내용 등)는 저장하지 않으므로, 그 상태에서 새로고침하면 "focus"로 안전하게 되돌린다.
const STORAGE_KEY = "kok-session";
const RESTORABLE_STEPS = ["preview", "focus", "timer", "complete"];

// 서버 렌더링 시점엔 localStorage가 없으므로 항상 null(= 저장된 것 없음)로 취급한다.
// microsteps가 비어있으면(저장 안 됐거나 손상) 복원하지 않는다.
function readSavedSession() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw);
    return saved.microsteps?.length ? saved : null;
  } catch {
    return null;
  }
}

// "마운트가 끝났는가"를 setState/effect 없이 알아내는 용도. useSyncExternalStore는 하이드레이션
// 중엔 항상 getServerSnapshot()(=false, 서버와 동일)을 쓰고, 마운트가 끝난 뒤에만 getSnapshot()
// (=true)으로 자동 전환해준다 - React가 이 훅을 위해 하이드레이션 불일치 없이 처리해준다.
function subscribeNoop() {
  return () => {};
}
function getMountedSnapshot() {
  return true;
}
function getServerMountedSnapshot() {
  return false;
}

function minutesUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.round((midnight - now) / 60000);
}

export default function Home() {
  const [step, setStep] = useState(() => {
    const saved = readSavedSession();
    if (!saved) return "input";
    return RESTORABLE_STEPS.includes(saved.step) ? saved.step : "focus";
  });
  const [microsteps, setMicrosteps] = useState(() => readSavedSession()?.microsteps ?? []);
  const [currentIndex, setCurrentIndex] = useState(() => readSavedSession()?.currentIndex ?? 0);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitError, setSplitError] = useState(null);
  const [completeError, setCompleteError] = useState(null);

  const [reasonChip, setReasonChip] = useState(null);
  const [rejectedTools, setRejectedTools] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [struggleLoading, setStruggleLoading] = useState(false);
  const [struggleError, setStruggleError] = useState(null);
  // encourage/shrink_step으로 하던 스텝을 계속할 때마다 쌓임(같은 스텝에서 여러 번 있을 수 있어서
  // 하나로 덮어쓰지 않고 배열로 모은다). 그 스텝이 나중에 진짜 끝나면 전부 done으로 갱신한다(S4).
  const [trackedAgentLogIds, setTrackedAgentLogIds] = useState([]);
  // 타이머가 실제로 시작된 시각(C10 행동 패턴: StartedAt/ActualMinutes 계산용, C04: 새로고침
  // 내구성에도 같이 씀). 새로고침 복원은 위 useState들처럼 초기값에서 한 번에 읽어온다 - 마운트
  // 이펙트에서 여러 setState를 연쇄로 부르지 않기 위해서다.
  const [stepStartedAt, setStepStartedAt] = useState(() => {
    const saved = readSavedSession()?.stepStartedAt;
    return saved ? new Date(saved) : null;
  });

  // 서버는 항상 "input"만 렌더링하므로(localStorage 접근 불가), 클라이언트도 마운트가
  // 끝나기 전까지는 위에서 복원한 값과 무관하게 "input"을 그린다 - 그렇지 않으면 서버가 그린
  // HTML과 클라이언트가 그리려는 화면이 처음부터 달라져 hydration 오류가 난다. 마운트 이후
  // 한 프레임 안에 실제 복원된 화면(effectiveStep)으로 바뀐다.
  const hasMounted = useSyncExternalStore(
    subscribeNoop,
    getMountedSnapshot,
    getServerMountedSnapshot
  );
  const effectiveStep = hasMounted ? step : "input";

  const task = microsteps[currentIndex]?.title ?? "";

  // 진행 상태가 바뀔 때마다 저장한다. "input"(할 일 입력 전 초기 화면)은 저장할 진행 상태가
  // 없으므로 건너뛴다.
  useEffect(() => {
    if (step === "input") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        step,
        currentIndex,
        microsteps,
        stepStartedAt: stepStartedAt?.toISOString() ?? null,
      })
    );
  }, [step, currentIndex, microsteps, stepStartedAt]);

  async function handleSubmit(text) {
    setIsSplitting(true);
    setSplitError(null);

    try {
      const response = await fetch("/api/brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error("할 일을 쪼개는 데 실패했어요, 다시 시도해줘");

      // 방금 응답을 그대로 쓰지 않고, Notion에 실제로 저장된 목록을 다시 읽어온다
      // (완료 처리에 필요한 Notion 페이지 id가 이 목록에만 있음).
      const stepsResponse = await fetch("/api/steps");
      const { steps } = await stepsResponse.json();
      setMicrosteps(steps);
      setCurrentIndex(0);
      setStep("preview");
    } catch (err) {
      setSplitError(err.message);
    } finally {
      setIsSplitting(false);
    }
  }

  async function handleStepFinish() {
    const current = microsteps[currentIndex];
    setCompleteError(null);

    const completedAt = new Date();
    const actualMinutes = stepStartedAt
      ? Math.round((completedAt - stepStartedAt) / 60000)
      : null;

    try {
      const response = await fetch("/api/steps/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          agentLogIds: trackedAgentLogIds,
          startedAt: stepStartedAt?.toISOString() ?? null,
          completedAt: completedAt.toISOString(),
          actualMinutes,
        }),
      });
      if (!response.ok) throw new Error("완료 처리에 실패했어요, 다시 시도해줘");
    } catch (err) {
      setCompleteError(err.message);
      return; // Notion에 Done 기록이 안 됐으니 다음 스텝으로 넘어가지 않는다.
    }

    setTrackedAgentLogIds([]);
    setStepStartedAt(null);
    advanceToNextStep();
  }

  // 완료 처리 없이(미루기 등) 그냥 다음 스텝으로 넘어갈 때 재사용.
  function advanceToNextStep() {
    const nextIndex = currentIndex + 1;
    if (nextIndex < microsteps.length) {
      setCurrentIndex(nextIndex);
      setStep("preview");
    } else {
      setStep("complete");
    }
  }

  function goHome() {
    setMicrosteps([]);
    setCurrentIndex(0);
    setStep("input");
    localStorage.removeItem(STORAGE_KEY);
  }

  function resetStruggleState() {
    setReasonChip(null);
    setRejectedTools([]);
    setProposal(null);
    setStruggleError(null);
  }

  // reasonChip 선택(첫 판단) 또는 거절(재판단) 시 공통으로 /api/struggle을 호출한다.
  async function callStruggle(chip, rejected) {
    setStruggleLoading(true);
    setStruggleError(null);

    try {
      const response = await fetch("/api/struggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reasonChip: chip,
          currentStep: microsteps[currentIndex],
          remainingSteps: microsteps.slice(currentIndex + 1),
          rejectedTools: rejected,
          remainingTimeMinutes: minutesUntilMidnight(),
        }),
      });
      if (!response.ok) throw new Error("판단 요청에 실패했어요, 다시 시도해줘");

      const proposed = await response.json();
      setProposal(proposed);
      setRejectedTools(rejected);
      setStep("proposal");
    } catch (err) {
      setStruggleError(err.message);
    } finally {
      setStruggleLoading(false);
    }
  }

  function handleReasonSelect(chip) {
    setReasonChip(chip);
    callStruggle(chip, []);
  }

  // 수락/거절 결정 하나를 AgentLog에 기록한다(S3 logStruggle). 실패해도 화면 흐름은 막지 않는다.
  async function logDecision(accepted) {
    try {
      const response = await fetch("/api/agent-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskCategory: microsteps[currentIndex]?.category,
          reasonChip,
          proposedTool: proposal.proposedTool,
          reason: proposal.reason,
          accepted,
        }),
      });
      const { id } = await response.json();
      return id;
    } catch {
      return null;
    }
  }

  function handleReject() {
    logDecision(false);
    callStruggle(reasonChip, [...rejectedTools, proposal.proposedTool]);
  }

  async function handleAccept() {
    // final:true면 서버가 proposedTool을 null로 보낸다(더 이상 제안할 tool이 없는 강제 종결
    // 상태라 rejectedTools 값을 재사용하지 않기 위해서). 값과 무관하게 end_session으로 처리한다.
    const tool = proposal.final ? "end_session" : proposal.proposedTool;
    const current = microsteps[currentIndex];

    if (tool === "suggest_break") {
      logDecision(true);
      setStep("rest");
      return;
    }

    if (tool === "end_session") {
      logDecision(true);
      goHome();
      return;
    }

    if (tool === "encourage") {
      // 구조 변경 없이 격려 문구(이미 proposal.reason으로 보여줌)만 전하고 하던 화면으로.
      // 이 스텝을 계속하는 거라, 나중에 진짜 완료되면 done으로 갱신할 수 있게 로그 id를 쌓아둔다.
      const logId = await logDecision(true);
      if (logId) setTrackedAgentLogIds((ids) => [...ids, logId]);
      resetStruggleState();
      setStep("focus");
      return;
    }

    if (tool === "shrink_step") {
      // 완료 기준 자체를 줄인다: /api/struggle이 함께 반환한 revisedTitle로 스텝 제목을 실제로 갱신.
      // 서버가 revisedTitle 없는 shrink_step은 이미 걸러주지만, 저장 자체가 실패할 수도 있어서
      // 응답을 확인한 뒤에만 성공으로 처리한다(실패 시 축소 없이 넘어가지 않도록).
      if (!proposal.revisedTitle) {
        setStruggleError("완료 기준을 줄이는 데 필요한 정보가 없었어요, 다시 시도해줘");
        return;
      }
      try {
        const shrinkResponse = await fetch("/api/steps/shrink", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, title: proposal.revisedTitle }),
        });
        if (!shrinkResponse.ok) throw new Error("완료 기준을 줄이는 데 실패했어요, 다시 시도해줘");
      } catch (err) {
        setStruggleError(err.message);
        return;
      }

      const logId = await logDecision(true);
      if (logId) setTrackedAgentLogIds((ids) => [...ids, logId]);
      const updated = [...microsteps];
      updated[currentIndex] = { ...updated[currentIndex], title: proposal.revisedTitle };
      setMicrosteps(updated);
      resetStruggleState();
      setStep("focus");
      return;
    }

    if (tool === "postpone_task") {
      logDecision(true);
      await fetch("/api/steps/postpone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });
      resetStruggleState();
      advanceToNextStep();
      return;
    }

    if (tool === "reorder_graph" || tool === "swap_task") {
      logDecision(true);
      // 지금 스텝을 뒤로 미루고, 남은 것 중 다음 스텝을 먼저 보여준다(로컬 순서만 변경).
      const rest = microsteps.slice(currentIndex + 1);
      const reordered = [
        ...microsteps.slice(0, currentIndex),
        ...rest,
        current,
      ];
      setMicrosteps(reordered);
      resetStruggleState();
      setStep("preview");
      return;
    }

    if (tool === "split_node") {
      logDecision(true);
      setStruggleLoading(true);
      try {
        await fetch("/api/brain-dump", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: current.title }),
        });
        await fetch("/api/steps/archive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id }),
        });
        const stepsResponse = await fetch("/api/steps");
        const { steps } = await stepsResponse.json();
        setMicrosteps(steps);
        setCurrentIndex(0);
        resetStruggleState();
        setStep("preview");
      } catch (err) {
        setStruggleError("재분할에 실패했어요, 다시 시도해줘");
      } finally {
        setStruggleLoading(false);
      }
      return;
    }
  }

  if (effectiveStep === "input") {
    return (
      <BrainDumpInput
        onSubmit={handleSubmit}
        isLoading={isSplitting}
        error={splitError}
      />
    );
  }

  if (effectiveStep === "preview") {
    return <TaskPreview task={task} onReady={() => setStep("focus")} />;
  }

  if (effectiveStep === "focus") {
    return (
      <OneFocusView
        task={task}
        onStart={() => {
          setStepStartedAt(new Date());
          setStep("timer");
        }}
        onStruggle={() => setStep("reason")}
      />
    );
  }

  if (effectiveStep === "reason") {
    return <ReasonChips onSelect={handleReasonSelect} />;
  }

  if (effectiveStep === "proposal") {
    if (struggleError) {
      return (
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <p>{struggleError}</p>
          <button onClick={() => callStruggle(reasonChip, rejectedTools)}>다시 시도</button>
        </main>
      );
    }
    return (
      <ProposalCard
        proposedTool={proposal?.proposedTool}
        reason={proposal?.reason}
        onAccept={handleAccept}
        onReject={handleReject}
        isLoading={struggleLoading}
        isFinal={proposal?.final}
      />
    );
  }

  if (effectiveStep === "timer") {
    if (completeError) {
      return (
        <main
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            gap: "16px",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <p>{completeError}</p>
          <button onClick={handleStepFinish}>다시 시도</button>
        </main>
      );
    }
    return (
      <FocusTimer
        durationMinutes={microsteps[currentIndex]?.estimatedMinutes ?? 25}
        startedAt={stepStartedAt}
        onFinish={handleStepFinish}
      />
    );
  }

  if (effectiveStep === "complete") {
    return <CompleteScreen task={task} />;
  }

  if (effectiveStep === "rest") {
    return <RestSuggestion onBackHome={goHome} />;
  }

  return null;
}
