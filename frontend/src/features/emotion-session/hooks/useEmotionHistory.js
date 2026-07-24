import { useEffect, useState } from "react";
import { EMOTION_ANALYSIS_LIMITS } from "../../../../../shared/contracts/emotionAnalysisContract";
import { listEmotionAnalyses } from "../api/emotionAnalysisApi";
import { SESSION_ERROR_MESSAGES } from "../constants/sessionMessages";
import useManagedAsync from "./useManagedAsync";

export default function useEmotionHistory(sessionId) {
  const [records, setRecords] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const { createController, releaseController } = useManagedAsync();

  useEffect(() => {
    const controller = createController();
    setIsLoading(true);
    setError("");

    const restoreHistory = async () => {
      try {
        const restoredRecords = await listEmotionAnalyses(sessionId, {
          limit: EMOTION_ANALYSIS_LIMITS.historyLimit,
          signal: controller.signal
        });

        if (!controller.signal.aborted) {
          setRecords(restoredRecords);
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(SESSION_ERROR_MESSAGES.history);
        }
      } finally {
        releaseController(controller);

        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void restoreHistory();

    return () => {
      controller.abort();
      releaseController(controller);
    };
  }, [createController, releaseController, sessionId]);

  return { records, isLoading, error };
}
