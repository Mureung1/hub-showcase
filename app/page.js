"use client";

import { useState } from "react";
import BrainDumpInput from "./components/BrainDumpInput";
import TaskPreview from "./components/TaskPreview";
import OneFocusView from "./components/OneFocusView";
import FocusTimer from "./components/FocusTimer";
import CompleteScreen from "./components/CompleteScreen";
import RestSuggestion from "./components/RestSuggestion";

// 지금은 진짜 Agent 호출 없이, 어떤 화면을 보여줄지만 관리한다.
// "input" -> "preview" -> "focus" -> "timer" -> "complete" / "rest"
export default function Home() {
  const [step, setStep] = useState("input");

  // mock 데이터: 진짜로는 Agent가 쪼갠 결과가 들어갈 자리
  const task = "책상 위 물건 세 개만 제 자리에";

  if (step === "input") {
    return (
      <BrainDumpInput
        onSubmit={(text) => {
          console.log("제출된 텍스트:", text);
          setStep("preview");
        }}
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
    return <RestSuggestion onBackHome={() => setStep("input")} />;
  }

  return null;
}
