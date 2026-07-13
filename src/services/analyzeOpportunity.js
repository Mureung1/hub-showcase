import { analyzeOpportunity as requestAnalysis } from "../api.js";
import { normalizeAnalysisResult } from "../utils/normalizeAnalysisResult.js";

export async function analyzeOpportunity(input) {
  const result = await requestAnalysis(input);
  return normalizeAnalysisResult(result);
}
