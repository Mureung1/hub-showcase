import { analyzeProjectContext } from "./contextAnalysisCore.mjs";
import { ApiError, toApiError } from "./apiErrors.mjs";
import { buildContextAnalysisResultV2 } from "./analysisResultV2.mjs";
import { normalizeContextImport } from "./contextImport.mjs";
import { allowOnly, readJson, writeApiError, writeData } from "./httpJson.mjs";
import {
  createModuBrainRepository,
  createModuBrainServiceRepository,
  createPublicShareRepository,
} from "./moduBrainRepository.mjs";
import {
  analysisRunAnnotationResource,
  analysisRunResource,
  analysisRunStepEventResource,
  contextImportResource,
  projectResource,
  shareLinkResource,
  sharedAnalysisResource,
  sourceSegmentResource,
  sourceResource,
} from "./resourceMappers.mjs";
import {
  clientIp,
  createShareToken,
  privacyIdentifier,
  requireUuid,
  sha256,
} from "./security.mjs";
import { createSupabaseGateway } from "./supabaseGateway.mjs";

const SOURCE_KINDS = new Set(["meeting", "research", "feedback", "note"]);
const ANNOTATION_TYPES = new Set(["confirmation", "correction", "question", "note"]);
const ANNOTATION_TARGET_TYPES = new Set([
  "run",
  "decision",
  "participant",
  "question",
  "term",
  "knowledge_node",
  "participant_view",
]);
const INPUT_CHARACTER_LIMIT = 100_000;
const OPENAI_TIMEOUT_MS = 30_000;

export function createApiV1Handler(options = {}) {
  const gateway = options.gateway || createSupabaseGateway(options.supabase);
  const analyze = options.analyze || analyzeProjectContext;

  return async function handleApiV1(req, res, pathname) {
    if (pathname === "/api/health/live") {
      try {
        if (!allowOnly(req, res, ["GET"])) return true;
        writeData(res, 200, { status: "ok", commit: resolveBuildCommit(options) });
      } catch (error) {
        writeApiError(res, toApiError(error));
      }
      return true;
    }

    if (pathname === "/api/health/ready") {
      try {
        if (!allowOnly(req, res, ["GET"])) return true;
        if (options.readyCheck) await options.readyCheck();
        else {
          const repository = createModuBrainRepository(gateway.asServiceRole());
          await repository.ready();
        }
        writeData(res, 200, { status: "ready" });
      } catch {
        writeApiError(
          res,
          new ApiError(503, "DATABASE_UNAVAILABLE", "데이터베이스를 사용할 수 없습니다."),
        );
      }
      return true;
    }

    if (!pathname.startsWith("/api/v1/")) return false;

    try {
      if (req.method === "OPTIONS") {
        allowOnly(req, res, ["GET", "POST", "PATCH", "DELETE"]);
        return true;
      }
      if (isMutation(req.method)) assertSameOrigin(req);

      if (pathname === "/api/v1/shared/resolve") {
        await handleSharedResolve(req, res, options, gateway);
        return true;
      }

      const user = options.authenticate
        ? await options.authenticate(req)
        : await gateway.authenticate(bearerToken(req));

      if (pathname === "/api/v1/capabilities") {
        if (!allowOnly(req, res, ["GET"])) return true;
        writeData(res, 200, { openaiEnabled: openAIEnabled(options) });
        return true;
      }

      const repository = options.repositoryFactory
        ? await options.repositoryFactory(user, req)
        : createModuBrainRepository(gateway.forUser(user.accessToken));

      if (pathname === "/api/v1/projects") {
        await handleProjects(req, res, repository, user);
        return true;
      }

      let match = pathname.match(/^\/api\/v1\/projects\/([^/]+)$/);
      if (match) {
        await handleProject(req, res, repository, requireUuid(match[1], "projectId"));
        return true;
      }

      match = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/sources$/);
      if (match) {
        await handleProjectSources(req, res, repository, requireUuid(match[1], "projectId"));
        return true;
      }

      match = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/imports$/);
      if (match) {
        await handleContextImport(
          req,
          res,
          repository,
          requireUuid(match[1], "projectId"),
        );
        return true;
      }

      match = pathname.match(/^\/api\/v1\/sources\/([^/]+)$/);
      if (match) {
        await handleSource(req, res, repository, requireUuid(match[1], "sourceId"));
        return true;
      }

      match = pathname.match(/^\/api\/v1\/sources\/([^/]+)\/segments$/);
      if (match) {
        await handleSourceSegments(
          req,
          res,
          repository,
          requireUuid(match[1], "sourceId"),
        );
        return true;
      }

      match = pathname.match(/^\/api\/v1\/projects\/([^/]+)\/analysis-runs$/);
      if (match) {
        const serviceRepository =
          req.method === "POST"
            ? await resolveServiceRepository(options, gateway, user, req)
            : null;
        await handleAnalysisRuns(req, res, {
          repository,
          serviceRepository,
          projectId: requireUuid(match[1], "projectId"),
          user,
          req,
          analyze,
          openAIEnabled: openAIEnabled(options),
          analysisOptions: options.analysisOptions,
        });
        return true;
      }

      match = pathname.match(/^\/api\/v1\/analysis-runs\/([^/]+)$/);
      if (match) {
        await handleAnalysisRun(req, res, repository, requireUuid(match[1], "runId"));
        return true;
      }

      match = pathname.match(/^\/api\/v1\/analysis-runs\/([^/]+)\/step-events$/);
      if (match) {
        await handleAnalysisRunStepEvents(
          req,
          res,
          repository,
          requireUuid(match[1], "runId"),
        );
        return true;
      }

      match = pathname.match(/^\/api\/v1\/analysis-runs\/([^/]+)\/annotations$/);
      if (match) {
        await handleAnalysisRunAnnotations(
          req,
          res,
          repository,
          requireUuid(match[1], "runId"),
        );
        return true;
      }

      match = pathname.match(/^\/api\/v1\/analysis-runs\/([^/]+)\/share-links$/);
      if (match) {
        const serviceRepository =
          req.method === "POST"
            ? await resolveServiceRepository(options, gateway, user, req)
            : null;
        await handleShareLinks(
          req,
          res,
          repository,
          serviceRepository,
          user,
          requireUuid(match[1], "runId"),
        );
        return true;
      }

      match = pathname.match(/^\/api\/v1\/share-links\/([^/]+)$/);
      if (match) {
        await handleShareLink(
          req,
          res,
          await resolveServiceRepository(options, gateway, user, req),
          user,
          requireUuid(match[1], "shareLinkId"),
        );
        return true;
      }

      throw new ApiError(404, "NOT_FOUND", "요청한 API 경로를 찾을 수 없습니다.");
    } catch (error) {
      if (res.destroyed) return true;
      writeApiError(res, toApiError(error));
      return true;
    }
  };
}

async function handleProjects(req, res, repository, user) {
  if (!allowOnly(req, res, ["GET", "POST"])) return;
  if (req.method === "GET") {
    const rows = await repository.listProjects();
    writeData(res, 200, rows.map(projectResource));
    return;
  }

  const body = await readJson(req);
  const values = validateProject(body, false);
  const row = await repository.createProject(user.id, values);
  writeData(res, 201, projectResource(row), { Location: `/api/v1/projects/${row.id}` });
}

async function handleProject(req, res, repository, projectId) {
  if (!allowOnly(req, res, ["GET", "PATCH", "DELETE"])) return;
  if (req.method === "GET") {
    writeData(res, 200, projectResource(await repository.getProject(projectId)));
    return;
  }
  if (req.method === "PATCH") {
    const values = validateProject(await readJson(req), true);
    writeData(res, 200, projectResource(await repository.updateProject(projectId, values)));
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.searchParams.get("permanent") === "true") {
    if (req.headers["x-confirm-permanent-delete"] !== "delete") {
      throw new ApiError(
        400,
        "DELETE_CONFIRMATION_REQUIRED",
        "영구 삭제에는 X-Confirm-Permanent-Delete: delete 헤더가 필요합니다.",
      );
    }
    await repository.deleteProject(projectId);
  } else {
    await repository.archiveProject(projectId);
  }
  writeData(res, 200, { id: projectId, deleted: true, permanent: url.searchParams.get("permanent") === "true" });
}

async function handleProjectSources(req, res, repository, projectId) {
  if (!allowOnly(req, res, ["GET", "POST"])) return;
  if (req.method === "GET") {
    const rows = await repository.listSources(projectId);
    writeData(res, 200, rows.map(sourceResource));
    return;
  }
  const values = validateSource(await readJson(req), false);
  const row = await repository.createSource(projectId, {
    ...values,
    content_sha256: sha256(values.content),
    char_count: unicodeLength(values.content),
  });
  writeData(res, 201, sourceResource(row), { Location: `/api/v1/sources/${row.id}` });
}

async function handleSource(req, res, repository, sourceId) {
  if (!allowOnly(req, res, ["GET", "PATCH", "DELETE"])) return;
  if (req.method === "GET") {
    writeData(res, 200, sourceResource(await repository.getSource(sourceId)));
    return;
  }
  if (req.method === "DELETE") {
    writeData(res, 200, sourceResource(await repository.archiveSource(sourceId)));
    return;
  }
  const body = await readJson(req);
  const values = validateSource(body, true);
  if (
    body.kind !== undefined ||
    body.content !== undefined ||
    body.occurredAt !== undefined
  ) {
    const current = await repository.getSource(sourceId);
    if (hasSourceImport(current)) {
      throw new ApiError(
        409,
        "IMPORTED_SOURCE_IMMUTABLE",
        "가져온 원문의 내용과 시각은 변경할 수 없습니다. 제목만 수정하거나 새로 가져와 주세요.",
      );
    }
  }
  if (values.content !== undefined) {
    values.content_sha256 = sha256(values.content);
    values.char_count = unicodeLength(values.content);
  }
  writeData(res, 200, sourceResource(await repository.updateSource(sourceId, values)));
}

function hasSourceImport(source) {
  return Array.isArray(source?.source_imports)
    ? source.source_imports.length > 0
    : Boolean(source?.source_imports);
}

async function handleContextImport(req, res, repository, projectId) {
  if (!allowOnly(req, res, ["POST"])) return;
  const normalized = normalizeContextImport(await readJson(req));
  const title = boundedString(normalized.title, "title", 1, 120);
  const content = boundedString(
    normalized.content,
    "content",
    1,
    INPUT_CHARACTER_LIMIT,
    false,
  );
  const imported = await repository.importSourceContext(projectId, {
    kind: normalized.kind,
    title,
    content,
    occurredAt: normalized.occurredAt,
    provider: normalized.provider,
    externalId: boundedOptionalString(normalized.externalId, "externalId", 500),
    participants: normalized.participants.slice(0, 200),
    metadata: normalized.metadata,
    segments: normalized.segments,
  });
  writeData(
    res,
    imported.duplicate ? 200 : 201,
    contextImportResource(imported),
    { Location: `/api/v1/sources/${imported.source.id}` },
  );
}

async function handleSourceSegments(req, res, repository, sourceId) {
  if (!allowOnly(req, res, ["GET"])) return;
  const rows = await repository.listSourceSegments(sourceId);
  writeData(res, 200, rows.map(sourceSegmentResource));
}

async function handleAnalysisRuns(req, res, context) {
  if (!allowOnly(req, res, ["GET", "POST"])) return;
  if (req.method === "GET") {
    const rows = await context.repository.listRuns(context.projectId);
    writeData(res, 200, rows.map(analysisRunResource));
    return;
  }

  const idempotencyKey = String(req.headers["idempotency-key"] || "").trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    throw new ApiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "8~128자의 Idempotency-Key 헤더가 필요합니다.",
    );
  }

  const body = validateAnalysisRequest(await readJson(req));
  const mode = body.mode;
  if (mode === "openai" && !context.openAIEnabled) {
    throw new ApiError(503, "OPENAI_NOT_ENABLED", "OpenAI 분석이 활성화되지 않았습니다.");
  }
  const model =
    mode === "openai"
      ? context.analysisOptions?.model ||
        process.env.MODU_BRAIN_OPENAI_MODEL ||
        "gpt-5.6-terra"
      : null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  req.once("aborted", abort);
  res.once("close", abort);
  const startedAt = Date.now();
  let createdRunId = null;
  let terminal = false;
  let stepSequence = 0;
  let activeStep = null;
  let activeStepStartedAt = null;

  const appendStepEvent = async (step, status, values = {}) => {
    if (!createdRunId) return null;
    stepSequence += 1;
    return context.serviceRepository.appendRunStepEvent(
      createdRunId,
      context.user.id,
      {
        sequence: stepSequence,
        eventKey: `${step}:${status}`,
        step,
        status,
        ...values,
      },
    );
  };
  const beginStep = async (step) => {
    activeStep = step;
    activeStepStartedAt = Date.now();
    await appendStepEvent(step, "started");
  };
  const finishStep = async (status, code, values = {}) => {
    const step = activeStep;
    if (!step) return;
    const durationMs = Math.max(0, Date.now() - activeStepStartedAt);
    await appendStepEvent(step, status, { code, durationMs, ...values });
    activeStep = null;
    activeStepStartedAt = null;
  };

  try {
    throwIfAborted(controller, req, res);
    const project = await context.repository.getProject(context.projectId);
    throwIfAborted(controller, req, res);
    const selected = await context.repository.getSources(context.projectId, body.sourceIds);
    throwIfAborted(controller, req, res);
    if (selected.length !== body.sourceIds.length) {
      throw new ApiError(400, "INVALID_SOURCE_SELECTION", "선택한 기록을 사용할 수 없습니다.");
    }
    const totalCharacters = selected.reduce(
      (sum, source) => sum + unicodeLength(source.content),
      0,
    );
    if (totalCharacters > INPUT_CHARACTER_LIMIT) {
      throw new ApiError(
        413,
        "ANALYSIS_INPUT_TOO_LARGE",
        "분석 입력은 총 100,000자 이하여야 합니다.",
      );
    }
    const requestFingerprint = sha256(
      JSON.stringify({
        projectTitle: project.title,
        sources: selected
          .map((source) => ({
            id: source.id,
            kind: source.kind,
            title: source.title,
            contentSha256: source.content_sha256,
          }))
          .sort((left, right) => left.id.localeCompare(right.id)),
        mode,
        model,
      }),
    );

    const started = await context.repository.startRun({
      projectId: context.projectId,
      sourceIds: body.sourceIds,
      idempotencyKey,
      requestFingerprint,
      providerMode: mode,
      providerModel: model,
    });
    if (!started.reused) {
      createdRunId = started.run.id;
      await beginStep("source_snapshot");
    }
    throwIfAborted(controller, req, res);
    if (started.reused) {
      writeData(res, 200, analysisRunResource(started.run));
      return;
    }

    const snapshots = await context.repository.getRunSnapshots(createdRunId);
    throwIfAborted(controller, req, res);
    await finishStep("succeeded", "SNAPSHOT_READY", {
      sourceCount: snapshots.length,
      inputCharacters: snapshots.reduce(
        (sum, source) => sum + unicodeLength(String(source.content_snapshot || "")),
        0,
      ),
    });

    await beginStep("provider_analysis");

    if (mode === "openai") {
      const [globalAllowed, ipAllowed] = await Promise.all([
        context.serviceRepository.consumeOpenAIRateLimit("openai:global:day", "global"),
        context.serviceRepository.consumeOpenAIRateLimit(
          "openai:ip:hour",
          sha256(clientIp(context.req)),
        ),
      ]);
      throwIfAborted(controller, req, res);
      if (!globalAllowed || !ipAllowed) {
        throw new ApiError(
          429,
          "OPENAI_RATE_LIMITED",
          "OpenAI 분석 사용량 한도를 초과했습니다.",
          undefined,
          { "Retry-After": "3600" },
        );
      }
    }
    const rawText = snapshots
      .map(
        (source) =>
          `[${source.source_kind}: ${source.source_title}]\n${source.content_snapshot}`,
      )
      .join("\n\n");
    const result = await context.analyze(
      { projectTitle: project.title, rawText },
      {
        ...(context.analysisOptions || {}),
        provider: mode === "openai" ? "openai" : "local-heuristic",
        model,
        reasoningEffort: "low",
        timeoutMs: OPENAI_TIMEOUT_MS,
        maxRawTextLength: INPUT_CHARACTER_LIMIT + body.sourceIds.length * 150,
        safetyIdentifier: privacyIdentifier(
          context.user.id,
          context.analysisOptions?.safetyIdentifierSecret,
        ),
        signal: controller.signal,
      },
    );
    throwIfAborted(controller, req, res);
    await finishStep("succeeded", "PROVIDER_COMPLETED");

    await beginStep("evidence_validation");
    const resultV2 = buildContextAnalysisResultV2(result, snapshots, createdRunId);
    await finishStep("succeeded", "EVIDENCE_VERIFIED", {
      validationOutcome: "passed",
      outputItemCount: countAnalysisItems(resultV2),
      evidenceReferenceCount: countEvidenceReferences(resultV2),
    });

    await beginStep("result_persistence");
    const completed = await context.serviceRepository.completeRun(
      createdRunId,
      context.user.id,
      {
        status: "succeeded",
        result_jsonb: resultV2,
        latency_ms: Date.now() - startedAt,
        completed_at: new Date().toISOString(),
      },
    );
    terminal = true;
    try {
      await finishStep("succeeded", "RUN_PERSISTED");
    } catch {
      // The succeeded run is authoritative; observability must not turn it into an HTTP failure.
      activeStep = null;
      activeStepStartedAt = null;
    }
    if (!res.destroyed) {
      writeData(res, 201, analysisRunResource(completed), {
        Location: `/api/v1/analysis-runs/${createdRunId}`,
      });
    }
  } catch (error) {
    const cancelled = controller.signal.aborted;
    if (createdRunId && activeStep) {
      try {
        await finishStep(
          cancelled ? "cancelled" : "failed",
          cancelled ? "REQUEST_CANCELLED" : safeAnalysisCode(error),
          !cancelled && activeStep === "evidence_validation"
            ? { validationOutcome: "failed" }
            : {},
        );
      } catch {
        // The run terminal state remains authoritative if event persistence is unavailable.
      }
    }
    if (createdRunId && !terminal) {
      try {
        await context.serviceRepository.completeRun(createdRunId, context.user.id, {
          status: cancelled ? "cancelled" : "failed",
          error_code: cancelled ? "REQUEST_CANCELLED" : safeAnalysisCode(error),
          error_message: cancelled ? "요청이 취소되었습니다." : "분석을 완료하지 못했습니다.",
          latency_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
        });
        terminal = true;
      } catch {
        // A stale running lease is recovered transactionally by the next start request.
      }
    }
    throw error;
  } finally {
    req.off("aborted", abort);
    res.off("close", abort);
  }
}

async function handleAnalysisRun(req, res, repository, runId) {
  if (!allowOnly(req, res, ["GET", "DELETE"])) return;
  if (req.method === "GET") {
    writeData(res, 200, analysisRunResource(await repository.getRun(runId)));
    return;
  }
  await repository.deleteRun(runId);
  writeData(res, 200, { id: runId, deleted: true });
}

async function handleAnalysisRunStepEvents(req, res, repository, runId) {
  if (!allowOnly(req, res, ["GET"])) return;
  const rows = await repository.listRunStepEvents(runId);
  writeData(res, 200, rows.map(analysisRunStepEventResource));
}

async function handleAnalysisRunAnnotations(req, res, repository, runId) {
  if (!allowOnly(req, res, ["GET", "POST"])) return;
  if (req.method === "GET") {
    const rows = await repository.listRunAnnotations(runId);
    writeData(res, 200, rows.map(analysisRunAnnotationResource));
    return;
  }

  const idempotencyKey = requireIdempotencyKey(req);
  const values = validateRunAnnotation(await readJson(req));
  const created = await repository.createRunAnnotation(runId, {
    idempotencyKey,
    ...values,
  });
  writeData(
    res,
    created.reused ? 200 : 201,
    analysisRunAnnotationResource(created.annotation),
    { Location: `/api/v1/analysis-runs/${runId}/annotations` },
  );
}

async function handleShareLinks(req, res, repository, serviceRepository, user, runId) {
  if (!allowOnly(req, res, ["GET", "POST"])) return;
  if (req.method === "GET") {
    const rows = await repository.listShareLinks(runId);
    writeData(res, 200, rows.map(shareLinkResource));
    return;
  }
  const run = await repository.getRun(runId);
  if (run.status !== "succeeded") {
    throw new ApiError(409, "RUN_NOT_SHAREABLE", "성공한 분석만 공유할 수 있습니다.");
  }
  const body = await readJson(req);
  const expiresInDays = body.expiresInDays === undefined ? 7 : Number(body.expiresInDays);
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 30) {
    throw new ApiError(400, "INVALID_EXPIRATION", "공유 링크 만료일은 1~30일이어야 합니다.");
  }
  const token = createShareToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const row = await serviceRepository.createShareLink(runId, user.id, sha256(token), expiresAt);
  writeData(res, 201, {
    ...shareLinkResource(row),
    token,
    urlPath: `/share#token=${encodeURIComponent(token)}`,
  });
}

async function handleShareLink(req, res, serviceRepository, user, shareLinkId) {
  if (!allowOnly(req, res, ["DELETE"])) return;
  const row = await serviceRepository.revokeShareLink(shareLinkId, user.id);
  writeData(res, 200, shareLinkResource(row));
}

async function handleSharedResolve(req, res, options, gateway) {
  if (!allowOnly(req, res, ["POST"])) return;
  const body = await readJson(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token.length < 32 || token.length > 128) {
    throw new ApiError(404, "SHARE_NOT_FOUND", "공유 링크를 찾을 수 없습니다.");
  }
  const repository = options.publicRepository
    ? options.publicRepository
    : createPublicShareRepository(gateway.asServiceRole());
  const allowed = await repository.consumeRateLimit("share:hour", sha256(clientIp(req)), 60, 3600);
  if (!allowed) {
    throw new ApiError(429, "RATE_LIMITED", "요청 한도를 초과했습니다.", undefined, {
      "Retry-After": "3600",
    });
  }
  const shared = await repository.resolveShare(sha256(token));
  if (!shared) throw new ApiError(404, "SHARE_NOT_FOUND", "공유 링크를 찾을 수 없습니다.");
  writeData(res, 200, sharedAnalysisResource(shared));
}

function validateProject(body, partial) {
  assertObject(body);
  const values = {};
  if (!partial || body.title !== undefined) {
    values.title = boundedString(body.title, "title", 2, 120);
  }
  if (!partial || body.description !== undefined) {
    values.description = boundedString(body.description || "", "description", 0, 2_000);
  }
  if (partial && Object.keys(values).length === 0) {
    throw new ApiError(400, "EMPTY_UPDATE", "변경할 값을 입력해 주세요.");
  }
  return values;
}

function validateSource(body, partial) {
  assertObject(body);
  const values = {};
  if (!partial || body.kind !== undefined) {
    if (!SOURCE_KINDS.has(body.kind)) {
      throw new ApiError(400, "INVALID_SOURCE_KIND", "기록 유형이 올바르지 않습니다.");
    }
    values.kind = body.kind;
  }
  if (!partial || body.title !== undefined) values.title = boundedString(body.title, "title", 1, 120);
  if (!partial || body.content !== undefined) {
    values.content = boundedString(body.content, "content", 1, INPUT_CHARACTER_LIMIT, false);
  }
  if (!partial || body.occurredAt !== undefined) {
    values.occurred_at = optionalIsoDate(body.occurredAt);
  }
  if (partial && Object.keys(values).length === 0) {
    throw new ApiError(400, "EMPTY_UPDATE", "변경할 값을 입력해 주세요.");
  }
  return values;
}

function validateAnalysisRequest(body) {
  assertObject(body);
  if (!Array.isArray(body.sourceIds) || body.sourceIds.length < 1 || body.sourceIds.length > 50) {
    throw new ApiError(400, "INVALID_SOURCE_SELECTION", "1~50개의 기록을 선택해 주세요.");
  }
  const sourceIds = [...new Set(body.sourceIds.map((id) => requireUuid(id, "sourceId")))];
  if (sourceIds.length !== body.sourceIds.length) {
    throw new ApiError(400, "INVALID_SOURCE_SELECTION", "중복되지 않은 기록을 선택해 주세요.");
  }
  const requestedMode = String(body.mode || body.provider || "local").toLowerCase();
  const mode = ["local", "local-heuristic", "mock"].includes(requestedMode)
    ? "local"
    : requestedMode;
  if (!new Set(["local", "openai"]).has(mode)) {
    throw new ApiError(400, "INVALID_ANALYSIS_MODE", "분석 모드는 local 또는 openai여야 합니다.");
  }
  return { sourceIds, mode };
}

function validateRunAnnotation(body) {
  assertObject(body);
  const allowedKeys = new Set(["annotationType", "targetType", "targetId", "body"]);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    throw new ApiError(
      400,
      "INVALID_ANNOTATION",
      "Feedback accepts only annotationType, targetType, targetId, and body.",
    );
  }
  if (!ANNOTATION_TYPES.has(body.annotationType)) {
    throw new ApiError(400, "INVALID_ANNOTATION", "The annotation type is not supported.");
  }
  if (!ANNOTATION_TARGET_TYPES.has(body.targetType)) {
    throw new ApiError(400, "INVALID_ANNOTATION", "The annotation target is not supported.");
  }
  const targetId = boundedOptionalString(body.targetId, "targetId", 160);
  if (
    (body.targetType === "run" && targetId !== null) ||
    (body.targetType !== "run" && targetId === null)
  ) {
    throw new ApiError(400, "INVALID_ANNOTATION", "The annotation target is incomplete.");
  }
  return {
    annotationType: body.annotationType,
    targetType: body.targetType,
    targetId,
    body: boundedString(body.body, "body", 1, 2_000),
  };
}

function requireIdempotencyKey(req) {
  const idempotencyKey = String(req.headers["idempotency-key"] || "").trim();
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    throw new ApiError(
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "An 8-128 character Idempotency-Key header is required.",
    );
  }
  return idempotencyKey;
}

function boundedString(value, field, min, max, trim = true) {
  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_FIELD", `${field} 값이 올바르지 않습니다.`);
  }
  const normalized = trim ? value.trim() : value;
  const length = unicodeLength(normalized);
  if (length < min || length > max) {
    throw new ApiError(400, "INVALID_FIELD", `${field} 길이가 올바르지 않습니다.`, {
      field,
      minLength: min,
      maxLength: max,
    });
  }
  return normalized;
}

function boundedOptionalString(value, field, max) {
  if (value === null || value === undefined || value === "") return null;
  return boundedString(value, field, 1, max);
}

function optionalIsoDate(value) {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) {
    throw new ApiError(400, "INVALID_FIELD", "occurredAt 값이 올바르지 않습니다.");
  }
  return date.toISOString();
}

function assertObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_JSON", "JSON 객체를 입력해 주세요.");
  }
}

function bearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
  return match[1];
}

function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  // Host is defined by the actual HTTP request target. A client-controlled
  // X-Forwarded-Host must never redefine the same-origin security boundary.
  const host = req.headers.host;
  const protocol = req.headers["x-forwarded-proto"] || (req.socket?.encrypted ? "https" : "http");
  let expected;
  try {
    expected = new URL(`${protocol}://${host}`).origin;
  } catch {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "요청 출처가 허용되지 않습니다.");
  }
  if (new URL(origin).origin !== expected) {
    throw new ApiError(403, "ORIGIN_NOT_ALLOWED", "요청 출처가 허용되지 않습니다.");
  }
}

function safeAnalysisCode(error) {
  const code = String(error?.code || "ANALYSIS_FAILED");
  return /^[A-Z0-9_]{3,80}$/.test(code) ? code : "ANALYSIS_FAILED";
}

function countAnalysisItems(result) {
  return [
    result?.keyTerms,
    result?.decisions,
    result?.participants,
    result?.questions,
    result?.knowledgeMap?.nodes,
    result?.participantAgents?.views,
  ].reduce((sum, items) => sum + (Array.isArray(items) ? items.length : 0), 0);
}

function countEvidenceReferences(value) {
  if (Array.isArray(value)) {
    return value.reduce((sum, item) => sum + countEvidenceReferences(item), 0);
  }
  if (!value || typeof value !== "object") return 0;
  if (
    typeof value.sourceRecordId === "string" &&
    typeof value.sourceTitle === "string" &&
    typeof value.quote === "string"
  ) {
    return 1;
  }
  return Object.values(value).reduce(
    (sum, item) => sum + countEvidenceReferences(item),
    0,
  );
}

function throwIfAborted(controller, req, res) {
  if (
    !controller.signal.aborted &&
    !req.aborted &&
    !req.socket?.destroyed &&
    !res.destroyed
  ) {
    return;
  }
  controller.abort();
  throw new ApiError(499, "REQUEST_CANCELLED", "요청이 취소되었습니다.");
}

function isMutation(method) {
  return !new Set(["GET", "HEAD", "OPTIONS"]).has(method);
}

function unicodeLength(value) {
  return Array.from(value).length;
}

function openAIEnabled(options) {
  if (typeof options.openAIEnabled === "boolean") return options.openAIEnabled;
  return (
    String(process.env.MODU_BRAIN_OPENAI_ENABLED || "").toLowerCase() === "true" &&
    Boolean(process.env.OPENAI_API_KEY) &&
    Boolean(process.env.MODU_BRAIN_OPENAI_MODEL)
  );
}

function resolveBuildCommit(options) {
  const candidates = [
    options.buildCommit,
    process.env.RENDER_GIT_COMMIT,
    process.env.SOURCE_VERSION,
  ];
  for (const candidate of candidates) {
    const normalized = String(candidate || "").trim().toLowerCase();
    if (/^[0-9a-f]{7,40}$/.test(normalized)) return normalized;
  }
  return null;
}

function resolveServiceRepository(options, gateway, user, req) {
  return options.serviceRepositoryFactory
    ? options.serviceRepositoryFactory(user, req)
    : createModuBrainServiceRepository(gateway.asServiceRole());
}
