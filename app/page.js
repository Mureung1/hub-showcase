"use client";

import { useState } from "react";
import BrainDumpInput from "./components/BrainDumpInput";
import TaskPreview from "./components/TaskPreview";

// 지금은 진짜 Agent 호출 없이, 어떤 화면을 보여줄지만 관리한다.
// "input" -> "preview" -> (다음 단계에서 계속 추가 예정)
export default function Home() {
  const [step, setStep] = useState("input");

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
    // mock 데이터: 진짜로는 Agent가 쪼갠 결과가 들어갈 자리
    return (
      <TaskPreview
        task="책상 위 물건 세 개만 제 자리에"
        onReady={() => console.log("타이머 세팅 준비 완료")}
      />
    );
  }

  return null;
}
