import { useEffect, useReducer, useRef, useState } from "react";
import {
  mockMessages
} from "../../conversation";
import { analyzeMockContext } from "../../emotion-analysis";
import { scenarioPresets } from "../../scenario-simulation";
import {
  buildMessagesFromEmotionAnalyses,
  getOrCreateBrowserSessionId
} from "../utils/browserSession";
import {
  createManualFaceSignalMetadata,
  normalizeFaceSignalMetadata,
  toFaceSignalPayload
} from "../utils/faceSignalMetadata";
import useManagedAsync from "./useManagedAsync";
import useEmotionHistory from "./useEmotionHistory";
import {
  createEmotionAnalysisSubmission
} from "../services/createEmotionAnalysisSubmission";
import { SESSION_ERROR_MESSAGES } from "../constants/sessionMessages";
import {
  createInitialWorkflowState,
  emotionSessionWorkflowReducer
} from "../state/emotionSessionWorkflow";

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
  const [selectedScenario, setSelectedScenario] = useState(defaultScenario);
  const [emotionResult, setEmotionResult] = useState(createInitialResult);
  const [faceSignalMetadata, setFaceSignalMetadata] = useState(
    createManualFaceSignalMetadata
  );
  const [workflow, dispatchWorkflow] = useReducer(
    emotionSessionWorkflowReducer,
    undefined,
    createInitialWorkflowState
  );
  const {
    aiStatus,
    analysisStatus,
    analysisError,
    isSaving
  } = workflow;
  const isSavingRef = useRef(false);
  const {
    schedule,
    createController,
    releaseController,
    isMounted
  } = useManagedAsync();
  const {
    records: restoredRecords,
    isLoading: isHistoryLoading,
    error: historyError
  } = useEmotionHistory(sessionId);
  const lastAnalysisInputRef = useRef({
    situationText: "",
    faceSignal: defaultScenario.faceSignal,
    ...toFaceSignalPayload(createManualFaceSignalMetadata()),
    voiceSignal: defaultScenario.voiceSignal,
    selectedScenario: defaultScenario.value
  });

  useEffect(() => {
    if (historyError) {
      dispatchWorkflow({ type: "FAILED", error: historyError });
      return;
    }

    if (restoredRecords?.length > 0) {
      const latestRecord = restoredRecords[0];
      const restoredScenario =
        scenarioPresets[latestRecord.selectedScenario] || defaultScenario;

      setMessages(buildMessagesFromEmotionAnalyses(restoredRecords));
      setSelectedScenario({
        ...restoredScenario,
        faceSignal: latestRecord.faceSignal,
        voiceSignal: latestRecord.voiceSignal
      });
      setEmotionResult(latestRecord.analysisResult);
      setFaceSignalMetadata(normalizeFaceSignalMetadata(latestRecord));
      dispatchWorkflow({ type: "ANALYSIS_COMPLETED" });
      const restoredFaceMetadata = normalizeFaceSignalMetadata(latestRecord);
      lastAnalysisInputRef.current = {
        situationText: latestRecord.situationText,
        faceSignal: latestRecord.faceSignal,
        ...toFaceSignalPayload(restoredFaceMetadata),
        voiceSignal: latestRecord.voiceSignal,
        selectedScenario: latestRecord.selectedScenario
      };
    }
  }, [historyError, restoredRecords]);

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
      ...toFaceSignalPayload(createManualFaceSignalMetadata()),
      voiceSignal: scenario.voiceSignal,
      selectedScenario: scenario.value
    };
    setSelectedScenario(nextScenario);
    setFaceSignalMetadata(createManualFaceSignalMetadata());
    lastAnalysisInputRef.current = nextInput;

    try {
      const nextResult = runAnalysis(nextInput);
      setEmotionResult(nextResult);
      dispatchWorkflow({ type: "ANALYSIS_COMPLETED" });
    } catch {
      dispatchWorkflow({
        type: "FAILED",
        error: SESSION_ERROR_MESSAGES.analysis
      });
    }
  };

  const handleAnalyze = async ({
    situationText,
    faceSignal,
    faceSignalSource = "manual",
    faceSignalConfidence = null,
    faceSignalEvidence = [],
    faceSignalHeuristicVersion = null,
    voiceSignal
  }) => {
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
      faceSignalSource,
      faceSignalConfidence,
      faceSignalEvidence,
      faceSignalHeuristicVersion,
      voiceSignal,
      selectedScenario: selectedScenario.value
    };

    let nextResult;
    try {
      nextResult = runAnalysis(analysisInput);
    } catch {
      dispatchWorkflow({
        type: "FAILED",
        error: SESSION_ERROR_MESSAGES.analysis
      });
      return false;
    }

    const messageId = `${sessionId}-${Date.now()}`;
    const userMessage = { id: `${messageId}-user`, role: "user", content: situationText };
    lastAnalysisInputRef.current = analysisInput;
    setMessages((currentMessages) => [...currentMessages, userMessage]);
    dispatchWorkflow({ type: "ANALYSIS_STARTED" });
    isSavingRef.current = true;

    const controller = createController();

    try {
      const { createdRecord } = await createEmotionAnalysisSubmission({
        sessionId,
        analysisInput,
        analysisResult: nextResult,
        signal: controller.signal
      });

      if (!isMounted()) return false;

      setEmotionResult(createdRecord.analysisResult);
      setFaceSignalMetadata(normalizeFaceSignalMetadata(createdRecord));
      dispatchWorkflow({ type: "SAVE_SUCCEEDED" });
      const aiMessage = {
        id: `${messageId}-ai`,
        role: "ai",
        content: createdRecord.aiResponse
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);

      schedule(() => {
        dispatchWorkflow({ type: "AI_FINISHED" });
      }, 1000);
      return true;
    } catch (error) {
      if (error.name === "AbortError") return false;

      dispatchWorkflow({
        type: "FAILED",
        error: SESSION_ERROR_MESSAGES.save
      });
      return false;
    } finally {
      releaseController(controller);
      isSavingRef.current = false;

      if (isMounted()) {
        dispatchWorkflow({ type: "SAVING_FINISHED" });
      }
    }
  };

  const handleAnalyzeAgain = () => {
    if (analysisStatus === "analyzing" || isHistoryLoading || isSavingRef.current) return;
    dispatchWorkflow({ type: "REANALYSIS_STARTED" });

    try {
      const nextResult = runAnalysis();
      schedule(() => {
        setEmotionResult(nextResult);
        dispatchWorkflow({ type: "ANALYSIS_COMPLETED" });
      }, 250);
    } catch {
      dispatchWorkflow({
        type: "FAILED",
        error: SESSION_ERROR_MESSAGES.analysis
      });
    }
  };

  return {
    messages,
    aiStatus,
    selectedScenario,
    analysisStatus,
    emotionResult,
    faceSignalMetadata,
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
