import { ApiError } from "./apiErrors.mjs";

const projectSelect = "id,owner_id,title,description,archived_at,created_at,updated_at";
const sourceSelect =
  "id,project_id,kind,title,content,content_sha256,char_count,occurred_at,archived_at,created_at,updated_at,source_imports(id,provider,participants,segment_count,imported_at,metadata)";
const runSelect =
  "id,project_id,created_by,idempotency_key,status,provider_mode,provider_model,schema_version,result_jsonb,error_code,error_message,latency_ms,input_tokens,output_tokens,created_at,started_at,completed_at,analysis_run_sources(source_record_id)";
const runStepEventSelect =
  "id,analysis_run_id,sequence,event_key,step_name,status,validation_outcome,code,duration_ms,source_count,input_characters,output_item_count,evidence_reference_count,created_at";
const runAnnotationSelect =
  "id,analysis_run_id,annotation_type,target_type,target_id,body,created_at";
const shareSelect = "id,analysis_run_id,expires_at,revoked_at,created_at";

export function createModuBrainRepository(client) {
  return {
    async ready() {
      await client.request("projects?select=id&limit=1", { headers: { Range: "0-0" } });
      return true;
    },

    async listProjects() {
      return client.request(
        `projects?select=${projectSelect}&archived_at=is.null&order=updated_at.desc`,
      );
    },
    async createProject(userId, values) {
      return single(
        await client.request(`projects?select=${projectSelect}`, {
          method: "POST",
          prefer: "return=representation",
          body: { owner_id: userId, title: values.title, description: values.description },
        }),
      );
    },
    async getProject(projectId) {
      return requireSingle(
        await client.request(`projects?id=eq.${encode(projectId)}&select=${projectSelect}`),
      );
    },
    async updateProject(projectId, values) {
      return requireSingle(
        await client.request(`projects?id=eq.${encode(projectId)}&select=${projectSelect}`, {
          method: "PATCH",
          prefer: "return=representation",
          body: values,
        }),
      );
    },
    async archiveProject(projectId) {
      return this.updateProject(projectId, { archived_at: new Date().toISOString() });
    },
    async deleteProject(projectId) {
      const result = await client.request(`projects?id=eq.${encode(projectId)}&select=id`, {
        method: "DELETE",
        prefer: "return=representation",
      });
      requireSingle(result);
    },

    async listSources(projectId) {
      await this.getProject(projectId);
      return client.request(
        `source_records?project_id=eq.${encode(projectId)}&archived_at=is.null&select=${sourceSelect}&order=occurred_at.desc.nullslast,created_at.desc`,
      );
    },
    async createSource(projectId, values) {
      await this.getProject(projectId);
      return single(
        await client.request(`source_records?select=${sourceSelect}`, {
          method: "POST",
          prefer: "return=representation",
          body: { project_id: projectId, ...values },
        }),
      );
    },
    async importSourceContext(projectId, values) {
      const result = single(
        await client.request("rpc/import_source_context", {
          method: "POST",
          body: {
            p_project_id: projectId,
            p_kind: values.kind,
            p_title: values.title,
            p_content: values.content,
            p_provider: values.provider,
            p_external_id: values.externalId || null,
            p_occurred_at: values.occurredAt,
            p_participants: values.participants || [],
            p_metadata: values.metadata || {},
            p_segments: values.segments || [],
          },
        }),
      );
      if (!result?.source) {
        throw new ApiError(503, "DATABASE_UNAVAILABLE", "가져오기 결과를 저장하지 못했습니다.");
      }
      return result;
    },
    async getSource(sourceId) {
      return requireSingle(
        await client.request(`source_records?id=eq.${encode(sourceId)}&select=${sourceSelect}`),
      );
    },
    async getSources(projectId, sourceIds) {
      if (!sourceIds.length) return [];
      const values = sourceIds.map(encode).join(",");
      return client.request(
        `source_records?project_id=eq.${encode(projectId)}&id=in.(${values})&archived_at=is.null&select=${sourceSelect}&order=created_at.asc`,
      );
    },
    async updateSource(sourceId, values) {
      return requireSingle(
        await client.request(`source_records?id=eq.${encode(sourceId)}&select=${sourceSelect}`, {
          method: "PATCH",
          prefer: "return=representation",
          body: values,
        }),
      );
    },
    async archiveSource(sourceId) {
      return this.updateSource(sourceId, { archived_at: new Date().toISOString() });
    },
    async listSourceSegments(sourceId) {
      await this.getSource(sourceId);
      return client.request(
        `source_segments?source_record_id=eq.${encode(sourceId)}&select=id,source_record_id,ordinal,speaker,text,occurred_at,external_id,source_url&order=ordinal.asc`,
      );
    },

    async listRuns(projectId) {
      await this.getProject(projectId);
      return client.request(
        `analysis_runs?project_id=eq.${encode(projectId)}&select=${runSelect}&order=created_at.desc`,
      );
    },
    async getRun(runId) {
      return requireSingle(
        await client.request(`analysis_runs?id=eq.${encode(runId)}&select=${runSelect}`),
      );
    },
    async startRun(values) {
      const rows = await client.request("rpc/start_analysis_run", {
        method: "POST",
        body: {
          p_project_id: values.projectId,
          p_source_ids: values.sourceIds,
          p_idempotency_key: values.idempotencyKey,
          p_request_fingerprint: values.requestFingerprint,
          p_provider_mode: values.providerMode,
          p_provider_model: values.providerModel,
        },
      });
      const row = single(rows);
      return { reused: row.outcome === "reused", run: await this.getRun(row.run.id) };
    },
    async deleteRun(runId) {
      const result = await client.request(`analysis_runs?id=eq.${encode(runId)}&select=id`, {
        method: "DELETE",
        prefer: "return=representation",
      });
      requireSingle(result);
    },
    async getRunSnapshots(runId) {
      await this.getRun(runId);
      return client.request(
        `analysis_run_sources?analysis_run_id=eq.${encode(runId)}&select=source_record_id,source_title,source_kind,content_snapshot,content_sha256,char_count&order=created_at.asc`,
      );
    },
    async listRunStepEvents(runId) {
      await this.getRun(runId);
      return client.request(
        `analysis_run_step_events?analysis_run_id=eq.${encode(runId)}&select=${runStepEventSelect}&order=sequence.asc`,
      );
    },
    async listRunAnnotations(runId) {
      await this.getRun(runId);
      return client.request(
        `analysis_run_annotations?analysis_run_id=eq.${encode(runId)}&select=${runAnnotationSelect}&order=created_at.desc`,
      );
    },
    async createRunAnnotation(runId, values) {
      const result = single(
        await client.request("rpc/create_analysis_run_annotation", {
          method: "POST",
          body: {
            p_analysis_run_id: runId,
            p_idempotency_key: values.idempotencyKey,
            p_annotation_type: values.annotationType,
            p_target_type: values.targetType,
            p_target_id: values.targetId,
            p_body: values.body,
          },
        }),
      );
      if (!result?.annotation) {
        throw new ApiError(
          503,
          "DATABASE_UNAVAILABLE",
          "The annotation could not be persisted.",
        );
      }
      return {
        reused: result.outcome === "reused",
        annotation: result.annotation,
      };
    },

    async listShareLinks(runId) {
      await this.getRun(runId);
      return client.request(
        `share_links?analysis_run_id=eq.${encode(runId)}&select=${shareSelect}&order=created_at.desc`,
      );
    },
    async consumeRateLimit(scope, subject, limit, windowSeconds) {
      const rows = await client.request("rpc/consume_rate_limit", {
        method: "POST",
        body: {
          p_scope: scope,
          p_subject: subject,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        },
      });
      return rows === true || rows?.[0]?.consume_rate_limit === true;
    },
  };
}

export function createModuBrainServiceRepository(client) {
  return {
    async appendRunStepEvent(runId, userId, values) {
      requireSingle(
        await client.request(
          `analysis_runs?id=eq.${encode(runId)}&created_by=eq.${encode(userId)}&select=id`,
        ),
      );
      const rows = await client.request(
        `analysis_run_step_events?on_conflict=analysis_run_id,event_key&select=${runStepEventSelect}`,
        {
          method: "POST",
          prefer: "resolution=ignore-duplicates,return=representation",
          body: {
            analysis_run_id: runId,
            sequence: values.sequence,
            event_key: values.eventKey,
            step_name: values.step,
            status: values.status,
            validation_outcome: values.validationOutcome ?? null,
            code: values.code ?? null,
            duration_ms: values.durationMs ?? null,
            source_count: values.sourceCount ?? null,
            input_characters: values.inputCharacters ?? null,
            output_item_count: values.outputItemCount ?? null,
            evidence_reference_count: values.evidenceReferenceCount ?? null,
          },
        },
      );
      const inserted = single(rows);
      if (inserted) return inserted;
      return requireSingle(
        await client.request(
          `analysis_run_step_events?analysis_run_id=eq.${encode(runId)}&event_key=eq.${encode(values.eventKey)}&select=${runStepEventSelect}`,
        ),
      );
    },
    async completeRun(runId, userId, values) {
      return requireSingle(
        await client.request(
          `analysis_runs?id=eq.${encode(runId)}&created_by=eq.${encode(userId)}&status=eq.running&select=${runSelect}`,
          {
            method: "PATCH",
            prefer: "return=representation",
            body: completionValues(values),
          },
        ),
      );
    },
    async createShareLink(runId, userId, tokenHash, expiresAt) {
      requireSingle(
        await client.request(
          `analysis_runs?id=eq.${encode(runId)}&created_by=eq.${encode(userId)}&status=eq.succeeded&select=id`,
        ),
      );
      return requireSingle(
        await client.request(`share_links?select=${shareSelect}`, {
          method: "POST",
          prefer: "return=representation",
          body: {
            analysis_run_id: runId,
            created_by: userId,
            token_hash: tokenHash,
            expires_at: expiresAt,
          },
        }),
      );
    },
    async revokeShareLink(shareLinkId, userId) {
      return requireSingle(
        await client.request(
          `share_links?id=eq.${encode(shareLinkId)}&created_by=eq.${encode(userId)}&revoked_at=is.null&select=${shareSelect}`,
          {
            method: "PATCH",
            prefer: "return=representation",
            body: { revoked_at: new Date().toISOString() },
          },
        ),
      );
    },
    async consumeOpenAIRateLimit(scope, subject) {
      const rows = await client.request("rpc/consume_openai_rate_limit", {
        method: "POST",
        body: { p_scope: scope, p_subject: subject },
      });
      return rows === true || rows?.[0]?.consume_openai_rate_limit === true;
    },
  };
}

export function createPublicShareRepository(client) {
  return {
    async resolveShare(tokenHash) {
      const rows = await client.request("rpc/resolve_shared_analysis", {
        method: "POST",
        body: { p_token_hash: tokenHash },
      });
      return single(rows) || null;
    },
    async consumeRateLimit(scope, subject, limit, windowSeconds) {
      const rows = await client.request("rpc/consume_public_rate_limit", {
        method: "POST",
        body: {
          p_scope: scope,
          p_subject: subject,
          p_limit: limit,
          p_window_seconds: windowSeconds,
        },
      });
      return rows === true || rows?.[0]?.consume_public_rate_limit === true;
    },
  };
}

function encode(value) {
  return encodeURIComponent(String(value));
}

function single(rows) {
  return Array.isArray(rows) ? rows[0] || null : rows;
}

function requireSingle(rows) {
  const row = single(rows);
  if (!row) throw new ApiError(404, "NOT_FOUND", "요청한 리소스를 찾을 수 없습니다.");
  return row;
}

function completionValues(values) {
  const common = {
    status: values.status,
    latency_ms: values.latency_ms,
    completed_at: values.completed_at,
  };
  if (values.status === "succeeded") {
    return {
      ...common,
      result_jsonb: values.result_jsonb,
      input_tokens: values.input_tokens ?? null,
      output_tokens: values.output_tokens ?? null,
      error_code: null,
      error_message: null,
    };
  }
  return {
    ...common,
    result_jsonb: null,
    error_code: values.error_code || "ANALYSIS_FAILED",
    error_message: values.error_message || "분석을 완료하지 못했습니다.",
  };
}
