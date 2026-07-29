import { useEffect, useState } from "react";
import { listAnonymousEmotionAnalyses } from "../storage/anonymousEmotionStore";
import { listEmotionAnalyses } from "../api/emotionAnalysisApi";
import { EMOTION_ANALYSIS_LIMITS } from "../../../../../shared/contracts/emotionAnalysisContract";
import { SESSION_ERROR_MESSAGES } from "../constants/sessionMessages";
import useManagedAsync from "./useManagedAsync";

export default function useEmotionHistory(guestKey) {
  const [records, setRecords] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(guestKey));
  const [error, setError] = useState("");
  const { createController, releaseController } = useManagedAsync();

  useEffect(() => {
    if (!guestKey) {
      setError("");
      setIsLoading(false);
      setRecords(listAnonymousEmotionAnalyses());
      return undefined;
    }

    const controller = createController();
    setIsLoading(true);
    setError("");
    void listEmotionAnalyses({
      limit: EMOTION_ANALYSIS_LIMITS.historyLimit,
      signal: controller.signal,
      guestKey
    })
      .then((nextRecords) => {
        if (!controller.signal.aborted) setRecords(nextRecords);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setError(SESSION_ERROR_MESSAGES.history);
        }
      })
      .finally(() => {
        releaseController(controller);
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
      releaseController(controller);
    };
  }, [createController, guestKey, releaseController]);

  return { records, isLoading, error };
}
