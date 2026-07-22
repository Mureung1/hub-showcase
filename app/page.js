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

      const { microsteps: steps } = await response.json();
      setMicrosteps(steps);
      setCurrentIndex(0);
      setStep("preview");
    } catch (err) {
      setSplitError(err.message);
    } finally {
      setIsSplitting(false);
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
    return <FocusTimer durationMinutes={25} onFinish={() => setStep("complete")} />;
  }

  if (step === "complete") {
    return <CompleteScreen task={task} />;
  }

  if (step === "rest") {
    return <RestSuggestion onBackHome={goHome} />;
  }

  return null;
}
