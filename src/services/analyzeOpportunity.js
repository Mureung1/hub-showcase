import { analyzeOpportunity as requestAnalysis } from "../api.js";
import { normalizeAnalysisResult } from "../utils/normalizeAnalysisResult.js";

export async function analyzeOpportunity(input, accessToken) {
  const result = await requestAnalysis(input, accessToken);
  return normalizeAnalysisResult(result);
}
