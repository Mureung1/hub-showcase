import { useEffect, useRef, useState } from "react";
import {
  generateMockResponse,
  mockMessages
} from "../../conversation";
import { analyzeMockContext } from "../../emotion-analysis";
import { scenarioPresets } from "../../scenario-simulation";
import {
  createEmotionAnalysis,
  listEmotionAnalyses
} from "../api/emotionAnalysisApi";
import {
  buildMessagesFromEmotionAnalyses,
  getOrCreateBrowserSessionId
} from "../utils/browserSession";

const defaultScenario = scenarioPresets.normal;

function createInitialResult() {
  return analyzeMockContext({
    selectedScenario: defaultScenario.value,
    faceSignal: defaultScenario.faceSignal,
    voiceSignal: defaultScenario.voiceSignal
  });
}

export default function useEmotionSession() {
  const [sessionId] = useState(getOrCreateBrowserSessionId);
  const [messages, setMessages] = useState(mockMessages);
  const [aiStatus, setAiStatus] = useState("waiting");
  const [selectedScenario, setSelectedScenario] = useState(defaultScenario);
  const [analysisStatus, setAnalysisStatus] = useState("completed");
  const [emotionResult, setEmotionResult] = useState(createInitialResult);
  const [analysisError, setAnalysisError] = useState("");
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const timerIdsRef = useRef([]);
  const requestControllersRef = useRef(new Set());
  const isMountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const lastAnalysisInputRef = useRef({
    situationText: "",
    faceSignal: defaultScenario.faceSignal,
    voiceSignal: defaultScenario.voiceSignal,
    selectedScenario: defaultScenario.value
  });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      timerIdsRef.current.forEach((timerId) => window.clearTimeout(timerId));
      requestControllersRef.current.forEach((controller) => controller.abort());
    };
  }, []);

  const schedule = (callback, delay) => {
    const timerId = window.setTimeout(() => {
      timerIdsRef.current = timerIdsRef.current.filter((id) => id !== timerId);
      callback();
    }, delay);
    timerIdsRef.current.push(timerId);
  };

  useEffect(() => {
    const controller = new AbortController();
    requestControllersRef.current.add(controller);

    const restoreHistory = async () => {
      try {
        const records = await listEmotionAnalyses(sessionId, {
          limit: 20,
          signal: controller.signal
        });

        if (records.length > 0) {
          const latestRecord = records[0];
          const restoredScenario =
            scenarioPresets[latestRecord.selectedScenario] || defaultScenario;

          setMessages(buildMessagesFromEmotionAnalyses(records));
          setSelectedScenario({
            ...restoredScenario,
            faceSignal: latestRecord.faceSignal,
            voiceSignal: latestRecord.voiceSignal
          });
          setEmotionResult(latestRecord.analysisResult);
          setAnalysisStatus("completed");
          setAnalysisError("");
          lastAnalysisInputRef.current = {
            situationText: latestRecord.situationText,
            faceSignal: latestRecord.faceSignal,
            voiceSignal: latestRecord.voiceSignal,
            selectedScenario: latestRecord.selectedScenario
          };
        }
      } catch (error) {
        if (error.name !== "AbortError") {
          setAnalysisStatus("error");
          setAnalysisError("저장된 분석 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      } finally {
        requestControllersRef.current.delete(controller);

        if (!controller.signal.aborted) {
          setIsHistoryLoading(false);
        }
      }
    };

    restoreHistory();

    return () => {
      controller.abort();
      requestControllersRef.current.delete(controller);
    };
  }, [sessionId]);

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

  const handleAnalyze = async ({ situationText, faceSignal, voiceSignal }) => {
    if (
      aiStatus !== "waiting" ||
      analysisStatus === "analyzing" ||
      isHistoryLoading ||
      isSavingRef.current
    ) {
      return false;
    }

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

    const messageId = `${sessionId}-${Date.now()}`;
    const userMessage = { id: `${messageId}-user`, role: "user", content: situationText };
    const aiResponse = generateMockResponse(situationText, nextResult);

    lastAnalysisInputRef.current = analysisInput;
    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setAnalysisError("");
    setAnalysisStatus("analyzing");
    setAiStatus("thinking");
    setIsSaving(true);
    isSavingRef.current = true;

    const controller = new AbortController();
    requestControllersRef.current.add(controller);

    try {
      const createdRecord = await createEmotionAnalysis(
        {
          sessionId,
          situationText,
          faceSignal,
          voiceSignal,
          selectedScenario: selectedScenario.value,
          analysisResult: nextResult,
          aiResponse
        },
        { signal: controller.signal }
      );

      if (!isMountedRef.current) return false;

      setEmotionResult(createdRecord.analysisResult);
      setAnalysisStatus("completed");
      setAiStatus("speaking");
      const aiMessage = {
        id: `${messageId}-ai`,
        role: "ai",
        content: createdRecord.aiResponse
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      schedule(() => {
        setAiStatus("waiting");
      }, 1000);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;

      setAnalysisStatus("error");
      setAnalysisError("분석 결과를 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setAiStatus("waiting");
      return false;
    } finally {
      requestControllersRef.current.delete(controller);
      isSavingRef.current = false;

      if (isMountedRef.current) {
        setIsSaving(false);
      }
    }
  };

  const handleAnalyzeAgain = () => {
    if (analysisStatus === "analyzing" || isHistoryLoading || isSavingRef.current) return;
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
    isInputDisabled:
      aiStatus !== "waiting" ||
      analysisStatus === "analyzing" ||
      isHistoryLoading ||
      isSaving,
    handleScenarioChange,
    handleAnalyze,
    handleAnalyzeAgain
  };
}
