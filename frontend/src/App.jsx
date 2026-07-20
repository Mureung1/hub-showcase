import React, { useEffect, useRef, useState } from "react";
import {
  ConversationPanel,
  generateMockResponse,
  mockMessages
} from "./features/conversation";
import { analyzeMockEmotion, AnalysisStatus } from "./features/emotion-analysis";
import { EmotionInputForm } from "./features/emotion-input";
import { EmotionResult } from "./features/emotion-result";
import { ObservationStatus } from "./features/observation-status";
import {
  ScenarioSelector,
  scenarioPresets
} from "./features/scenario-simulation";
import ServiceHeader from "./shared/components/ServiceHeader";

const defaultScenario = scenarioPresets.normal;

export function analyzeMockContext({
  inputText = "",
  recentMessages = [],
  selectedScenario = "normal",
  faceSignal,
  voiceSignal
} = {}) {
  const scenario = scenarioPresets[selectedScenario] || defaultScenario;

  return analyzeMockEmotion({
    situationText: inputText,
    faceSignal: faceSignal || scenario.faceSignal,
    voiceSignal: voiceSignal || scenario.voiceSignal,
    recentMessages,
    selectedScenario
  });
}

function createInitialResult() {
  return analyzeMockContext({
    selectedScenario: defaultScenario.value,
    faceSignal: defaultScenario.faceSignal,
    voiceSignal: defaultScenario.voiceSignal
  });
}

export default function App() {
  console.count("App render");

  const [messages, setMessages] = useState(mockMessages);
  const [aiStatus, setAiStatus] = useState("waiting");
  const [selectedScenario, setSelectedScenario] = useState(defaultScenario);
  const [analysisStatus, setAnalysisStatus] = useState("completed");
  const [emotionResult, setEmotionResult] = useState(createInitialResult);
  const [analysisError, setAnalysisError] = useState("");
  const timerIdsRef = useRef([]);
  const lastAnalysisInputRef = useRef({
    situationText: "",
    faceSignal: defaultScenario.faceSignal,
    voiceSignal: defaultScenario.voiceSignal,
    selectedScenario: defaultScenario.value
  });

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const schedule = (callback, delay) => {
    const timerId = window.setTimeout(callback, delay);
    timerIdsRef.current.push(timerId);
  };

  const runAnalysis = (input = lastAnalysisInputRef.current, recentMessages = messages) =>
    analyzeMockContext({
      inputText: input.situationText,
      faceSignal: input.faceSignal,
      voiceSignal: input.voiceSignal,
      recentMessages,
      selectedScenario: input.selectedScenario
    });

  const handleScenarioChange = (scenarioValue) => {
    const scenario = scenarioPresets[scenarioValue] || defaultScenario;
    const nextScenario = { ...scenario };
    const nextInput = {
      ...lastAnalysisInputRef.current,
      faceSignal: scenario.faceSignal,
      voiceSignal: scenario.voiceSignal,
      selectedScenario: scenario.value
    };
    setSelectedScenario(nextScenario);
    setAnalysisError("");
    lastAnalysisInputRef.current = nextInput;

    try {
      const nextResult = runAnalysis(nextInput);
      setEmotionResult(nextResult);
      setAnalysisStatus("completed");
    } catch {
      setAnalysisError("분석 중 문제가 발생했습니다. 다시 시도해 주세요.");
      setAnalysisStatus("error");
    }
  };

  const handleAnalyze = ({ situationText, faceSignal, voiceSignal }) => {
    if (aiStatus !== "waiting" || analysisStatus === "analyzing") return false;

    const analysisInput = {
      situationText,
      faceSignal,
      voiceSignal,
      selectedScenario: selectedScenario.value
    };

    let nextResult;
    try {
      nextResult = runAnalysis(analysisInput);
    } catch {
      setAnalysisStatus("error");
      setAnalysisError("분석 중 문제가 발생했습니다. 다시 시도해 주세요.");
      return false;
    }

    const nextId = messages.length > 0 ? Math.max(...messages.map((message) => message.id)) + 1 : 1;
    const userMessage = { id: nextId, role: "user", content: situationText };

    lastAnalysisInputRef.current = analysisInput;
    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setAnalysisError("");
    setAnalysisStatus("analyzing");
    setAiStatus("thinking");

    schedule(() => {
      setEmotionResult(nextResult);
      setAnalysisStatus("completed");
    }, 250);

    schedule(() => {
      setAiStatus("speaking");
      const aiMessage = {
        id: nextId + 1,
        role: "ai",
        content: generateMockResponse(situationText, nextResult)
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      schedule(() => {
        setAiStatus("waiting");
      }, 1000);
    }, 1000);

    return true;
  };

  const handleAnalyzeAgain = () => {
    if (analysisStatus === "analyzing") return;
    setAnalysisStatus("analyzing");
    setAnalysisError("");

    try {
      const nextResult = runAnalysis();
      schedule(() => {
        setEmotionResult(nextResult);
        setAnalysisStatus("completed");
      }, 250);
    } catch {
      setAnalysisError("분석 중 문제가 발생했습니다. 다시 시도해 주세요.");
      setAnalysisStatus("error");
    }
  };

  const observation = selectedScenario.observation;
  const isInputDisabled = aiStatus !== "waiting" || analysisStatus === "analyzing";

  return (
    <div className="app-root">
      <aside className="sidebar">
        <ServiceHeader status={aiStatus} />
        <ObservationStatus observation={observation} />
        <ScenarioSelector
          value={selectedScenario.value}
          onChange={handleScenarioChange}
          disabled={isInputDisabled}
        />
        <AnalysisStatus status={analysisStatus} error={analysisError} />
        <EmotionResult
          result={emotionResult}
          onAnalyzeAgain={handleAnalyzeAgain}
          disabled={analysisStatus === "analyzing"}
        />
      </aside>

      <ConversationPanel messages={messages}>
        <EmotionInputForm
          scenarioPreset={selectedScenario}
          disabled={isInputDisabled}
          onAnalyze={handleAnalyze}
        />
      </ConversationPanel>
    </div>
  );
}
