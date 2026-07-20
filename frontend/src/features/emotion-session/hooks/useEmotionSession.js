import { useEffect, useRef, useState } from "react";
import {
  generateMockResponse,
  mockMessages
} from "../../conversation";
import { analyzeMockContext } from "../../emotion-analysis";
import { scenarioPresets } from "../../scenario-simulation";

const defaultScenario = scenarioPresets.normal;

function createInitialResult() {
  return analyzeMockContext({
    selectedScenario: defaultScenario.value,
    faceSignal: defaultScenario.faceSignal,
    voiceSignal: defaultScenario.voiceSignal
  });
}

export default function useEmotionSession() {
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

  return {
    messages,
    aiStatus,
    selectedScenario,
    analysisStatus,
    emotionResult,
    analysisError,
    observation: selectedScenario.observation,
    isInputDisabled: aiStatus !== "waiting" || analysisStatus === "analyzing",
    handleScenarioChange,
    handleAnalyze,
    handleAnalyzeAgain
  };
}
