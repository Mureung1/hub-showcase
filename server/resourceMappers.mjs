export function projectResource(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description || "",
    retentionDays: row.retention_days ?? null,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function sourceResource(row, options = {}) {
  const sourceImport = Array.isArray(row.source_imports)
    ? row.source_imports[0]
    : row.source_imports;
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
    ...(sourceImport
      ? {
          import: {
            id: sourceImport.id,
            provider: sourceImport.provider,
            participants: participantStrings(sourceImport.participants),
            segmentCount: sourceImport.segment_count || 0,
            importedAt: sourceImport.imported_at,
            ...(sourceImport.metadata ? { metadata: sourceImport.metadata } : {}),
          },
        }
      : {}),
  };
}

export function contextImportResource(row) {
  const importSummary = {
    id: row.import_id,
    provider: row.provider,
    participants: participantStrings(row.participants),
    segmentCount: row.segment_count || 0,
    importedAt: row.imported_at,
    ...(row.metadata ? { metadata: row.metadata } : {}),
  };
  const source = sourceResource(row.source);
  return {
    source: source.import ? source : { ...source, import: importSummary },
    importId: row.import_id,
    provider: row.provider,
    participants: importSummary.participants,
    segmentCount: row.segment_count || 0,
    duplicate: Boolean(row.duplicate),
  };
}

function participantStrings(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim())
    : [];
}

export function sourceSegmentResource(row) {
  return {
    id: row.id,
    sourceRecordId: row.source_record_id,
    ordinal: row.ordinal,
    speaker: row.speaker,
    text: row.text,
    occurredAt: row.occurred_at,
    externalId: row.external_id,
    sourceUrl: row.source_url,
  };
}

export function analysisRunResource(row) {
  const snapshotRows = row.analysis_run_sources || [];
  const sourceIds = row.source_ids || snapshotRows.map((item) => item.source_record_id).filter(Boolean);
  const stages = [...(row.analysis_run_step_events || [])]
    .sort((left, right) => Number(left.sequence || 0) - Number(right.sequence || 0))
    .map((event) => ({
      name: event.step_name,
      status: event.status,
      validationOutcome: event.validation_outcome ?? null,
      code: event.code ?? null,
      durationMs: event.duration_ms ?? null,
    }));
  return {
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    schemaVersion: row.schema_version,
    pipelineVersion: "2.0",
    stages,
    evidenceCoverage: evidenceCoverage(row.result_jsonb),
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

function evidenceCoverage(result) {
  if (!result || typeof result !== "object") return { eligible: 0, validated: 0 };
  const items = [
    ...(Array.isArray(result.decisions) ? result.decisions : []),
    ...(Array.isArray(result.participants) ? result.participants : []),
    ...(Array.isArray(result.questions) ? result.questions : []),
    ...(Array.isArray(result.keyTerms) ? result.keyTerms : []),
  ];
  return {
    eligible: items.length,
    validated: items.filter((item) => Array.isArray(item?.evidence) && item.evidence.length > 0).length,
  };
}

export function analysisRunStepEventResource(row) {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    sequence: row.sequence,
    eventKey: row.event_key,
    step: row.step_name,
    status: row.status,
    validationOutcome: row.validation_outcome,
    code: row.code,
    durationMs: row.duration_ms,
    sourceCount: row.source_count,
    inputCharacters: row.input_characters,
    outputItemCount: row.output_item_count,
    evidenceReferenceCount: row.evidence_reference_count,
    createdAt: row.created_at,
  };
}

export function analysisRunAnnotationResource(row) {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    annotationType: row.annotation_type,
    target: {
      type: row.target_type,
      ...(row.target_id ? { id: row.target_id } : {}),
    },
    body: row.body,
    createdAt: row.created_at,
  };
}

export function shareLinkResource(row) {
  return {
    id: row.id,
    analysisRunId: row.analysis_run_id,
    disclosureMode: row.disclosure_mode || "summary",
    includeProjectTitle: Boolean(row.include_project_title),
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export function sharedAnalysisResource(row) {
  const disclosureMode = row.disclosure_mode === "evidence" ? "evidence" : "summary";
  const participantNames = collectParticipantNames(row.result_jsonb);
  const sanitizedResult = sanitizeSharedValue(row.result_jsonb, {
    disclosureMode,
    participantNames,
    includeProjectTitle: Boolean(row.include_project_title),
    projectTitle: String(row.project_title || row.result_jsonb?.projectTitle || "").trim(),
  });
  return {
    projectTitle: row.include_project_title ? row.project_title : null,
    disclosureMode,
    // Keep a stable public shape without re-introducing participant identities.
    result: sanitizedResult && typeof sanitizedResult === "object"
      ? {
          ...sanitizedResult,
          participants: [],
          participantAgents: {
            views: [],
            agreementPoints: [],
            tensionPoints: [],
            privacyNote: "공유본에서는 참여자 관점을 공개하지 않습니다.",
          },
        }
      : sanitizedResult,
    completedAt: row.completed_at,
    expiresAt: row.expires_at,
  };
}

function sanitizeSharedValue(value, options, parentKey = "") {
  if (typeof value === "string") {
    const projectSafeValue = !options.includeProjectTitle && options.projectTitle
      ? value.replaceAll(options.projectTitle, "공유 프로젝트")
      : value;
    if (options.disclosureMode === "evidence" && parentKey === "quote") return projectSafeValue;
    return redactParticipantNames(projectSafeValue, options.participantNames);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSharedValue(item, options, parentKey));
  }
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
    "participants",
    "participantAgents",
  ]);
  if (options.disclosureMode === "summary") {
    blocked.add("evidence");
    blocked.add("quote");
    blocked.add("sourceTitle");
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !blocked.has(key))
      .map(([key, item]) => [key, sanitizeSharedValue(item, options, key)]),
  );
}

function collectParticipantNames(result) {
  const names = new Set();
  const candidates = [
    ...(Array.isArray(result?.participants) ? result.participants : []),
    ...(Array.isArray(result?.participantAgents?.views) ? result.participantAgents.views : []),
  ];
  for (const candidate of candidates) {
    for (const key of ["actor", "name", "participant", "participantName"]) {
      const value = typeof candidate?.[key] === "string" ? candidate[key].trim() : "";
      if (value.length >= 2 && value.length <= 80) names.add(value);
    }
  }
  return [...names].sort((left, right) => right.length - left.length);
}

function redactParticipantNames(value, names) {
  let redacted = value;
  names.forEach((name, index) => {
    redacted = redacted.replaceAll(name, `참여자 ${index + 1}`);
  });
  return redacted;
}
