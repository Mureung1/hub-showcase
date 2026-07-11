import { analyzeProjectContext } from "./contextAnalysisCore.mjs";
import { ApiError, toApiError } from "./apiErrors.mjs";
import { buildContextAnalysisResultV2 } from "./analysisResultV2.mjs";
import { allowOnly, readJson, writeApiError, writeData } from "./httpJson.mjs";
import {
  createModuBrainRepository,
  createModuBrainServiceRepository,
  createPublicShareRepository,
} from "./moduBrainRepository.mjs";
import {
  analysisRunResource,
  projectResource,
  shareLinkResource,
  sharedAnalysisResource,
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
const INPUT_CHARACTER_LIMIT = 100_000;
const OPENAI_TIMEOUT_MS = 30_000;

export function createApiV1Handler(options = {}) {
  const gateway = options.gateway || createSupabaseGateway(options.supabase);
  const analyze = options.analyze || analyzeProjectContext;

  return async function handleApiV1(req, res, pathname) {
    if (pathname === "/api/health/live") {
      try {
        if (!allowOnly(req, res, ["GET"])) return true;
        writeData(res, 200, { status: "ok" });
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

      match = pathname.match(/^\/api\/v1\/sources\/([^/]+)$/);
      if (match) {
        await handleSource(req, res, repository, requireUuid(match[1], "sourceId"));
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
  const values = validateSource(await readJson(req), true);
  if (values.content !== undefined) {
    values.content_sha256 = sha256(values.content);
    values.char_count = unicodeLength(values.content);
  }
  writeData(res, 200, sourceResource(await repository.updateSource(sourceId, values)));
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
    if (!started.reused) createdRunId = started.run.id;
    throwIfAborted(controller, req, res);
    if (started.reused) {
      writeData(res, 200, analysisRunResource(started.run));
      return;
    }

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
    const snapshots = await context.repository.getRunSnapshots(createdRunId);
    throwIfAborted(controller, req, res);
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
    const resultV2 = buildContextAnalysisResultV2(result, snapshots, createdRunId);
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
    if (!res.destroyed) {
      writeData(res, 201, analysisRunResource(completed), {
        Location: `/api/v1/analysis-runs/${createdRunId}`,
      });
    }
  } catch (error) {
    const cancelled = controller.signal.aborted;
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

function resolveServiceRepository(options, gateway, user, req) {
  return options.serviceRepositoryFactory
    ? options.serviceRepositoryFactory(user, req)
    : createModuBrainServiceRepository(gateway.asServiceRole());
}
