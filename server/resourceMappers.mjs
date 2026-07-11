export function projectResource(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description || "",
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sourceResource(row, options = {}) {
  return {
    id: row.id,
    projectId: row.project_id,
    kind: row.kind,
    title: row.title,
    ...(options.includeContent === false ? {} : { content: row.content }),
    contentSha256: row.content_sha256,
    charCount: row.char_count,
    occurredAt: row.occurred_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function analysisRunResource(row) {
  const snapshotRows = row.analysis_run_sources || [];
  const sourceIds = row.source_ids || snapshotRows.map((item) => item.source_record_id).filter(Boolean);
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    schemaVersion: row.schema_version,
    sourceIds,
    provider: {
      mode: row.provider_mode,
      ...(row.provider_model ? { model: row.provider_model } : {}),
    },
    ...(row.result_jsonb ? { result: row.result_jsonb } : {}),
    ...(row.error_code
      ? { error: { code: row.error_code, message: row.error_message || "분석에 실패했습니다." } }
      : {}),
    latencyMs: row.latency_ms,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function shareLinkResource(row) {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function sharedAnalysisResource(row) {
  return {
    projectTitle: row.project_title,
    result: sanitizeSharedValue(row.result_jsonb),
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  };
}

function sanitizeSharedValue(value) {
  if (Array.isArray(value)) return value.map(sanitizeSharedValue);
  if (!value || typeof value !== "object") return value;
  const blocked = new Set([
    "analysisRunId",
    "inputTokens",
    "latencyMs",
    "model",
    "outputTokens",
    "projectId",
    "provider",
    "providerModel",
    "runId",
    "sourceIds",
    "sourceRecordId",
  ]);
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blocked.has(key))
      .map(([key, item]) => [key, sanitizeSharedValue(item)]),
  );
}
