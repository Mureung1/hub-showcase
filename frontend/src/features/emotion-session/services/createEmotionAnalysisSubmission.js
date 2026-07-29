import { generateMockResponse } from "../../conversation";
import { createAnonymousEmotionAnalysis } from "../storage/anonymousEmotionStore";

export async function createEmotionAnalysisSubmission({
  sessionId,
  analysisInput,
  analysisResult,
  recentMessages = [],
  signal,
  generateResponse,
  saveAnalysis = createAnonymousEmotionAnalysis
}) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  const fallbackResponse = generateMockResponse(
    analysisInput.situationText,
    analysisResult,
    { recentMessages }
  );
  let aiResponse = fallbackResponse;

  if (typeof generateResponse === "function") {
    try {
      aiResponse = await generateResponse(
        {
          message: analysisInput.situationText,
          recentMessages,
          analysis: analysisResult
        },
        { signal }
      );
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      aiResponse = fallbackResponse;
    }
  }
  const faceSignal =
    analysisInput.faceSignalSource === "camera"
      ? null
      : analysisInput.faceSignal;
  const createdRecord = await saveAnalysis(
    {
      sessionId,
      ...analysisInput,
      faceSignal,
      analysisResult,
      aiResponse
    },
    { signal }
  );

  return {
    aiResponse,
    createdRecord
  };
}
