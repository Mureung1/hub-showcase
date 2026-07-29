import { getSupabaseClient } from "../config/supabaseClient.js";
import {
  EMOTION_ANALYSIS_LIMITS
} from "../../shared/contracts/emotionAnalysisContract.js";

const EMOTION_ANALYSIS_COLUMNS = [
  "id",
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

export class GuestStorageLimitError extends Error {
  constructor() {
    super("The guest analysis storage limit has been reached.");
    this.name = "GuestStorageLimitError";
    this.code = "GUEST_STORAGE_LIMIT_EXCEEDED";
    this.status = 429;
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
    if (error.code === "P0001" && error.message === "GUEST_STORAGE_LIMIT_EXCEEDED") {
      throw new GuestStorageLimitError();
    }

    throw new SupabaseRepositoryError(
      "Failed to create the emotion analysis record.",
      error
    );
  }

  return data;
}

export async function listEmotionAnalysesBySession(
  guestSessionId,
  limit = EMOTION_ANALYSIS_LIMITS.historyLimit
) {
  if (typeof guestSessionId !== "string" || !guestSessionId.trim()) {
    throw new TypeError("guestSessionId must be a non-empty string.");
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > EMOTION_ANALYSIS_LIMITS.maximumHistoryLimit
  ) {
    throw new TypeError(
      `limit must be an integer between 1 and ` +
        `${EMOTION_ANALYSIS_LIMITS.maximumHistoryLimit}.`
    );
  }

  const { data, error } = await getSupabaseClient()
    .from("emotion_analyses")
    .select(EMOTION_ANALYSIS_COLUMNS)
    .eq("guest_session_id", guestSessionId.trim())
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
