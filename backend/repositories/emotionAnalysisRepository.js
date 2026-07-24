import { getSupabaseClient } from "../config/supabaseClient.js";

const EMOTION_ANALYSIS_COLUMNS = [
  "id",
  "session_id",
  "situation_text",
  "face_signal",
  "face_signal_source",
  "face_signal_confidence",
  "face_signal_evidence",
  "face_signal_heuristic_version",
  "voice_signal",
  "selected_scenario",
  "analysis_result",
  "ai_response",
  "created_at"
].join(",");

export class SupabaseRepositoryError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = "SupabaseRepositoryError";
    this.code = "SUPABASE_QUERY_FAILED";
  }
}

export async function createEmotionAnalysis(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new TypeError("Emotion analysis record must be an object.");
  }

  const { data, error } = await getSupabaseClient()
    .from("emotion_analyses")
    .insert(record)
    .select(EMOTION_ANALYSIS_COLUMNS)
    .single();

  if (error) {
    throw new SupabaseRepositoryError(
      "Failed to create the emotion analysis record.",
      error
    );
  }

  return data;
}

export async function listEmotionAnalysesBySession(sessionId, limit = 20) {
  if (typeof sessionId !== "string" || !sessionId.trim()) {
    throw new TypeError("sessionId must be a non-empty string.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError("limit must be an integer between 1 and 100.");
  }

  const { data, error } = await getSupabaseClient()
    .from("emotion_analyses")
    .select(EMOTION_ANALYSIS_COLUMNS)
    .eq("session_id", sessionId.trim())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new SupabaseRepositoryError(
      "Failed to list the emotion analysis records.",
      error
    );
  }

  return data;
}
