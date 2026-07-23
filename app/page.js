"use client";

import { useState } from "react";
import BrainDumpInput from "./components/BrainDumpInput";
import TaskPreview from "./components/TaskPreview";
import OneFocusView from "./components/OneFocusView";
import FocusTimer from "./components/FocusTimer";
import CompleteScreen from "./components/CompleteScreen";
import RestSuggestion from "./components/RestSuggestion";

// "input" -> "preview" -> "focus" -> "timer" -> "complete" / "rest"
export default function Home() {
  const [step, setStep] = useState("input");
  const [microsteps, setMicrosteps] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitError, setSplitError] = useState(null);
  const [completeError, setCompleteError] = useState(null);

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

    try {
      const response = await fetch("/api/steps/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });
      if (!response.ok) throw new Error("완료 처리에 실패했어요, 다시 시도해줘");
    } catch (err) {
      setCompleteError(err.message);
      return; // Notion에 Done 기록이 안 됐으니 다음 스텝으로 넘어가지 않는다.
    }

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
        onStart={() => setStep("timer")}
        onStruggle={() => setStep("rest")}
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
