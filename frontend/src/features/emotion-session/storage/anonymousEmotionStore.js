import { EMOTION_ANALYSIS_LIMITS } from "../../../../../shared/contracts/emotionAnalysisContract.js";

const ANONYMOUS_RECORDS_KEY = "anonymous-emotion-analysis-records";

function readStoredRecords(storage) {
  try {
    const value = JSON.parse(storage.getItem(ANONYMOUS_RECORDS_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function listAnonymousEmotionAnalyses({
  storage = window.sessionStorage,
  limit = EMOTION_ANALYSIS_LIMITS.historyLimit
} = {}) {
  return readStoredRecords(storage).slice(0, limit);
}

export function createAnonymousEmotionAnalysis(
  record,
  {
    storage = window.sessionStorage,
    createId = () => window.crypto.randomUUID(),
    now = () => new Date()
  } = {}
) {
  const createdRecord = {
    id: createId(),
    ...record,
    createdAt: now().toISOString()
  };
  const records = [createdRecord, ...readStoredRecords(storage)].slice(
    0,
    EMOTION_ANALYSIS_LIMITS.maximumHistoryLimit
  );

  storage.setItem(ANONYMOUS_RECORDS_KEY, JSON.stringify(records));
  return createdRecord;
}
