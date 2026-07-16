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
  const [messages, setMessages] = useState(mockMessages);
  const [situationText, setSituationText] = useState("");
  const [aiStatus, setAiStatus] = useState("waiting");
  const [selectedScenario, setSelectedScenario] = useState(defaultScenario.value);
  const [faceSignal, setFaceSignal] = useState(defaultScenario.faceSignal);
  const [voiceSignal, setVoiceSignal] = useState(defaultScenario.voiceSignal);
  const [analysisStatus, setAnalysisStatus] = useState("completed");
  const [emotionResult, setEmotionResult] = useState(createInitialResult);
  const [validationError, setValidationError] = useState("");
  const timerIdsRef = useRef([]);

  useEffect(() => {
    return () => {
      timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
    };
  }, []);

  const schedule = (callback, delay) => {
    const timerId = window.setTimeout(callback, delay);
    timerIdsRef.current.push(timerId);
  };

  const runAnalysis = ({
    text = situationText,
    nextFaceSignal = faceSignal,
    nextVoiceSignal = voiceSignal,
    nextScenario = selectedScenario,
    recentMessages = messages
  } = {}) =>
    analyzeMockContext({
      inputText: text,
      faceSignal: nextFaceSignal,
      voiceSignal: nextVoiceSignal,
      recentMessages,
      selectedScenario: nextScenario
    });

  const handleScenarioChange = (scenarioValue) => {
    const scenario = scenarioPresets[scenarioValue] || defaultScenario;
    setSelectedScenario(scenario.value);
    setFaceSignal(scenario.faceSignal);
    setVoiceSignal(scenario.voiceSignal);
    setValidationError("");

    try {
      const nextResult = runAnalysis({
        nextScenario: scenario.value,
        nextFaceSignal: scenario.faceSignal,
        nextVoiceSignal: scenario.voiceSignal
      });
      setEmotionResult(nextResult);
      setAnalysisStatus("completed");
    } catch {
      setAnalysisStatus("error");
    }
  };

  const handleSituationChange = (nextValue) => {
    setSituationText(nextValue);
    if (validationError) setValidationError("");
  };

  const handleSubmit = () => {
    const trimmedText = situationText.trim();
    if (!trimmedText) {
      setValidationError("분석할 상황을 입력해 주세요.");
      return;
    }
    if (aiStatus !== "waiting" || analysisStatus === "analyzing") return;

    let nextResult;
    try {
      nextResult = runAnalysis({ text: trimmedText });
    } catch {
      setAnalysisStatus("error");
      setValidationError("분석 중 문제가 발생했습니다. 다시 시도해 주세요.");
      return;
    }

    const nextId = messages.length > 0 ? Math.max(...messages.map((message) => message.id)) + 1 : 1;
    const userMessage = { id: nextId, role: "user", content: trimmedText };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setSituationText("");
    setValidationError("");
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
        content: generateMockResponse(trimmedText, nextResult)
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      schedule(() => {
        setAiStatus("waiting");
      }, 1000);
    }, 1000);
  };

  const handleAnalyzeAgain = () => {
    if (analysisStatus === "analyzing") return;
    setAnalysisStatus("analyzing");
    setValidationError("");

    try {
      const nextResult = runAnalysis({
        text: situationText.trim() || emotionResult?.inputText || ""
      });
      schedule(() => {
        setEmotionResult(nextResult);
        setAnalysisStatus("completed");
      }, 250);
    } catch {
      setAnalysisStatus("error");
    }
  };

  const observation = (scenarioPresets[selectedScenario] || defaultScenario).observation;
  const isInputDisabled = aiStatus !== "waiting" || analysisStatus === "analyzing";

  return (
    <div className="app-root">
      <aside className="sidebar">
        <ServiceHeader status={aiStatus} />
        <ObservationStatus observation={observation} />
        <ScenarioSelector
          value={selectedScenario}
          onChange={handleScenarioChange}
          disabled={isInputDisabled}
        />
        <AnalysisStatus status={analysisStatus} error={validationError} />
        <EmotionResult
          result={emotionResult}
          onAnalyzeAgain={handleAnalyzeAgain}
          disabled={analysisStatus === "analyzing"}
        />
      </aside>

      <ConversationPanel messages={messages}>
        <EmotionInputForm
          situationText={situationText}
          onSituationChange={handleSituationChange}
          faceSignal={faceSignal}
          onFaceSignalChange={setFaceSignal}
          voiceSignal={voiceSignal}
          onVoiceSignalChange={setVoiceSignal}
          validationError={validationError}
          disabled={isInputDisabled}
          onSubmit={handleSubmit}
        />
      </ConversationPanel>
    </div>
  );
}
