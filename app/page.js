"use client";

import { useState } from "react";
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
function minutesUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.round((midnight - now) / 60000);
}

export default function Home() {
  const [step, setStep] = useState("input");
  const [microsteps, setMicrosteps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
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
  // 타이머가 실제로 시작된 시각(C10 행동 패턴: StartedAt/ActualMinutes 계산용).
  const [stepStartedAt, setStepStartedAt] = useState(null);

  const task = microsteps[currentIndex]?.title ?? "";

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

  if (step === "input") {
    return (
      <BrainDumpInput
        onSubmit={handleSubmit}
        isLoading={isSplitting}
        error={splitError}
      />
    );
  }

  if (step === "preview") {
    return <TaskPreview task={task} onReady={() => setStep("focus")} />;
  }

  if (step === "focus") {
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

  if (step === "reason") {
    return <ReasonChips onSelect={handleReasonSelect} />;
  }

  if (step === "proposal") {
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

  if (step === "timer") {
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
        onFinish={handleStepFinish}
      />
    );
  }

  if (step === "complete") {
    return <CompleteScreen task={task} />;
  }

  if (step === "rest") {
    return <RestSuggestion onBackHome={goHome} />;
  }

  return null;
}
