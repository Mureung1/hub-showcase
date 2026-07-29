import { createAnonymousEmotionAnalysis } from "../storage/anonymousEmotionStore.js";

const NOA_SLEEP_RESPONSE = "Noa는 자고 있어요.";
const AI_LIMIT_ERROR_CODES = new Set([
  "AI_RATE_LIMITED",
  "AI_RATE_LIMIT_EXCEEDED"
]);

export async function createEmotionAnalysisSubmission({
  sessionId,
  analysisInput,
  previewAnalysisResult,
  recentMessages = [],
  signal,
  generateResponse,
  saveAnalysis = createAnonymousEmotionAnalysis
}) {
  if (signal?.aborted) {
    throw new DOMException("The operation was aborted.", "AbortError");
  }

  if (typeof generateResponse !== "function") {
    throw new TypeError("generateResponse must be configured.");
  }

  let generated;
  try {
    generated = await generateResponse(
      {
        message: analysisInput.situationText,
        recentMessages,
        signals: {
          faceSignalSource: analysisInput.faceSignalSource,
          faceSignalConfidence: analysisInput.faceSignalConfidence,
          faceFeatures: analysisInput.faceFeatures,
          voiceSignal: analysisInput.voiceSignal
        }
      },
      { signal }
    );
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    if (!AI_LIMIT_ERROR_CODES.has(error?.code)) throw error;
    generated = {
      response: NOA_SLEEP_RESPONSE,
      analysis: previewAnalysisResult,
      source: "quota"
    };
  }
  const aiResponse = generated?.response;
  const analysisResult = generated?.analysis;
  if (
    typeof aiResponse !== "string" ||
    !aiResponse.trim() ||
    !analysisResult ||
    !Array.isArray(analysisResult.scores)
  ) {
    throw new TypeError("generateResponse returned an invalid result.");
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
