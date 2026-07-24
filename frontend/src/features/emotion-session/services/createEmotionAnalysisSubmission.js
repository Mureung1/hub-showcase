import { generateMockResponse } from "../../conversation";
import { createEmotionAnalysis } from "../api/emotionAnalysisApi";

export async function createEmotionAnalysisSubmission({
  sessionId,
  analysisInput,
  analysisResult,
  signal
}) {
  const aiResponse = generateMockResponse(
    analysisInput.situationText,
    analysisResult
  );
  const faceSignal =
    analysisInput.faceSignalSource === "camera"
      ? null
      : analysisInput.faceSignal;
  const createdRecord = await createEmotionAnalysis(
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
