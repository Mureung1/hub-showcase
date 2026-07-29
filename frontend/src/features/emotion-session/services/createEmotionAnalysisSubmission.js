import { generateMockResponse } from "../../conversation";
import { createAnonymousEmotionAnalysis } from "../storage/anonymousEmotionStore";

export async function createEmotionAnalysisSubmission({
  sessionId,
  analysisInput,
  analysisResult,
  recentMessages = [],
  signal,
  saveAnalysis = createAnonymousEmotionAnalysis
}) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const aiResponse = generateMockResponse(
    analysisInput.situationText,
    analysisResult,
    { recentMessages }
  );
  const faceSignal =
    analysisInput.faceSignalSource === "camera"
      ? null
      : analysisInput.faceSignal;
  const createdRecord = saveAnalysis({
    sessionId,
    ...analysisInput,
    faceSignal,
    analysisResult,
    aiResponse
  });

  return {
    aiResponse,
    createdRecord
  };
}
