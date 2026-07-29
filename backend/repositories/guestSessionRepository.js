import { getSupabaseClient } from "../config/supabaseClient.js";
import { SupabaseRepositoryError } from "./emotionAnalysisRepository.js";

const HASH_PATTERN = /^[0-9a-f]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireKeyHash(keyHash) {
  if (typeof keyHash !== "string" || !HASH_PATTERN.test(keyHash)) {
    throw new TypeError("keyHash must be a lowercase SHA-256 hex digest.");
  }
}

function requireGuestSessionId(guestSessionId) {
  if (typeof guestSessionId !== "string" || !UUID_PATTERN.test(guestSessionId)) {
    throw new TypeError("guestSessionId must be a valid UUID.");
  }
}

function repositoryFailure(message, error) {
  throw new SupabaseRepositoryError(message, error);
}

export async function createGuestSession(
  { keyHash, expiresAt },
  client = getSupabaseClient()
) {
  requireKeyHash(keyHash);

  if (!(expiresAt instanceof Date) || Number.isNaN(expiresAt.valueOf())) {
    throw new TypeError("expiresAt must be a valid Date.");
  }

  const { data, error } = await client
    .from("guest_sessions")
    .insert({ key_hash: keyHash, expires_at: expiresAt.toISOString() })
    .select("id,created_at,last_accessed_at,expires_at")
    .single();

  if (error) {
    repositoryFailure("Failed to create the guest session.", error);
  }

  return data;
}

export async function findActiveGuestSessionByKeyHash(
  keyHash,
  now = new Date(),
  client = getSupabaseClient()
) {
  requireKeyHash(keyHash);

  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new TypeError("now must be a valid Date.");
  }

  const { data, error } = await client
    .from("guest_sessions")
    .select("id,created_at,last_accessed_at,expires_at")
    .eq("key_hash", keyHash)
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (error) {
    repositoryFailure("Failed to find the guest session.", error);
  }

  return data;
}

export async function listConversationMessagesByGuestSession(
  guestSessionId,
  limit = 100,
  client = getSupabaseClient()
) {
  requireGuestSessionId(guestSessionId);

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new TypeError("limit must be an integer between 1 and 100.");
  }

  const { data, error } = await client
    .from("conversation_messages")
    .select("id,role,content,created_at")
    .eq("guest_session_id", guestSessionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    repositoryFailure("Failed to list the guest conversation.", error);
  }

  return data;
}

export async function touchGuestSession(
  guestSessionId,
  accessedAt = new Date(),
  client = getSupabaseClient()
) {
  requireGuestSessionId(guestSessionId);

  if (!(accessedAt instanceof Date) || Number.isNaN(accessedAt.valueOf())) {
    throw new TypeError("accessedAt must be a valid Date.");
  }

  const { data, error } = await client
    .from("guest_sessions")
    .update({ last_accessed_at: accessedAt.toISOString() })
    .eq("id", guestSessionId)
    .select("id,created_at,last_accessed_at,expires_at")
    .single();

  if (error) {
    repositoryFailure("Failed to update the guest session.", error);
  }

  return data;
}

export async function deleteGuestSession(
  guestSessionId,
  keyHash,
  client = getSupabaseClient()
) {
  requireGuestSessionId(guestSessionId);
  requireKeyHash(keyHash);

  const { error } = await client
    .from("guest_sessions")
    .delete()
    .eq("id", guestSessionId)
    .eq("key_hash", keyHash);

  if (error) {
    repositoryFailure("Failed to delete the guest session.", error);
  }
}

export async function deleteExpiredGuestSessions(
  now = new Date(),
  client = getSupabaseClient()
) {
  if (!(now instanceof Date) || Number.isNaN(now.valueOf())) {
    throw new TypeError("now must be a valid Date.");
  }

  const { error } = await client
    .from("guest_sessions")
    .delete()
    .lt("expires_at", now.toISOString());

  if (error) {
    repositoryFailure("Failed to delete expired guest sessions.", error);
  }
}

export async function consumeGuestAiQuota(
  guestSessionId,
  {
    limit,
    windowSeconds,
    client = getSupabaseClient()
  }
) {
  requireGuestSessionId(guestSessionId);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError("limit must be a positive integer.");
  }

  if (!Number.isInteger(windowSeconds) || windowSeconds < 1) {
    throw new TypeError("windowSeconds must be a positive integer.");
  }

  const { data, error } = await client.rpc("consume_guest_ai_quota", {
    p_guest_session_id: guestSessionId,
    p_limit: limit,
    p_window_seconds: windowSeconds
  });

  if (error) {
    repositoryFailure("Failed to consume the guest AI quota.", error);
  }

  return data === true;
}
