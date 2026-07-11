// @vitest-environment node

import { createServer } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./apiErrors.mjs";
import { createApiV1Handler } from "./apiV1.mjs";
import { sha256 } from "./security.mjs";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const SOURCE_ID = "33333333-3333-4333-8333-333333333333";
const RUN_ID = "44444444-4444-4444-8444-444444444444";
const SHARE_ID = "55555555-5555-4555-8555-555555555555";
const IMPORT_ID = "66666666-6666-4666-8666-666666666666";
const SEGMENT_ID = "77777777-7777-4777-8777-777777777777";
const now = "2026-07-11T00:00:00.000Z";
const content = "민지는 입력 흐름을 단순하게 만들자고 제안했다. 서준은 결정 근거와 질문을 함께 보여주자고 말했다. 팀은 직접 입력 방식으로 시작하기로 결정했다. 다음 회의에서 공유 범위를 검토하기로 했다.";

let server;
let baseUrl;
let repository;
let publicRepository;
let analyze;
let openAIFlag;
let activeResponse;

beforeEach(() => {
  repository = createFakeRepository();
  publicRepository = {
    consumeRateLimit: vi.fn().mockResolvedValue(true),
    resolveShare: vi.fn().mockResolvedValue({
      project_title: "테스트 프로젝트",
      result_jsonb: {
        ...sampleAnalysis(),
        provider: { mode: "llm", model: "private-model" },
        decisions: [
          {
            id: "decision_public",
            evidence: [{ sourceRecordId: SOURCE_ID, sourceTitle: "회의록", quote: "근거" }],
          },
        ],
      },
      completed_at: now,
      expires_at: "2026-07-18T00:00:00.000Z",
    }),
  };
  analyze = vi.fn().mockResolvedValue(sampleAnalysis());
  openAIFlag = true;
});

beforeAll(async () => {
  const handler = createApiV1Handler({
    authenticate: async (req) => {
      if (req.headers.authorization !== "Bearer valid-token") {
        throw new ApiError(401, "AUTH_REQUIRED", "로그인이 필요합니다.");
      }
      return { id: USER_ID, accessToken: "valid-token" };
    },
    repositoryFactory: async () => repository,
    serviceRepositoryFactory: async () => repository,
    get publicRepository() {
      return publicRepository;
    },
    analyze: (...args) => analyze(...args),
    get openAIEnabled() {
      return openAIFlag;
    },
    readyCheck: async () => true,
  });
  server = createServer(async (req, res) => {
    activeResponse = res;
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    const handled = await handler(req, res, pathname);
    if (!handled) {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

describe("v1 API", () => {
  it("reports liveness/readiness and returns JSON 405/OPTIONS responses", async () => {
    const live = await fetch(`${baseUrl}/api/health/live`);
    expect(live.status).toBe(200);
    await expect(live.json()).resolves.toEqual({ data: { status: "ok" } });

    const wrongMethod = await fetch(`${baseUrl}/api/health/live`, { method: "POST" });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toContain("GET");

    const options = await fetch(`${baseUrl}/api/v1/projects`, { method: "OPTIONS" });
    expect(options.status).toBe(204);
    expect(await options.text()).toBe("");
  });

  it("requires a Supabase bearer session", async () => {
    const response = await fetch(`${baseUrl}/api/v1/projects`);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "AUTH_REQUIRED" } });
  });

  it("reports authenticated OpenAI capability and rejects disabled OpenAI runs", async () => {
    expect((await (await api("/api/v1/capabilities")).json()).data.openaiEnabled).toBe(true);
    openAIFlag = false;
    expect((await (await api("/api/v1/capabilities")).json()).data.openaiEnabled).toBe(false);
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "openai-disabled" },
      body: { sourceIds: [SOURCE_ID], mode: "openai" },
    });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "OPENAI_NOT_ENABLED" } });
    expect(repository.startRun).not.toHaveBeenCalled();
  });

  it("creates, lists, updates, archives, and permanently deletes projects", async () => {
    const created = await api("/api/v1/projects", {
      method: "POST",
      body: { title: "새 프로젝트", description: "설명" },
    });
    expect(created.status).toBe(201);
    expect((await created.json()).data.title).toBe("새 프로젝트");

    const list = await api("/api/v1/projects");
    expect((await list.json()).data).toHaveLength(1);

    const updated = await api(`/api/v1/projects/${PROJECT_ID}`, {
      method: "PATCH",
      body: { title: "수정 프로젝트" },
    });
    expect((await updated.json()).data.title).toBe("수정 프로젝트");

    const archived = await api(`/api/v1/projects/${PROJECT_ID}`, { method: "DELETE" });
    expect((await archived.json()).data).toMatchObject({ deleted: true, permanent: false });

    const permanent = await api(`/api/v1/projects/${PROJECT_ID}?permanent=true`, {
      method: "DELETE",
      headers: { "X-Confirm-Permanent-Delete": "delete" },
    });
    expect((await permanent.json()).data.permanent).toBe(true);
  });

  it("creates, reads, updates, lists and archives source records with a content hash", async () => {
    const created = await api(`/api/v1/projects/${PROJECT_ID}/sources`, {
      method: "POST",
      body: { kind: "meeting", title: "회의록", content, occurredAt: now },
    });
    const createdBody = await created.json();
    expect(created.status).toBe(201);
    expect(createdBody.data.contentSha256).toBe(sha256(content));

    expect((await (await api(`/api/v1/projects/${PROJECT_ID}/sources`)).json()).data).toHaveLength(1);
    expect((await (await api(`/api/v1/sources/${SOURCE_ID}`)).json()).data.content).toBe(content);

    const updated = await api(`/api/v1/sources/${SOURCE_ID}`, {
      method: "PATCH",
      body: { title: "수정 회의록", content: "😀😀" },
    });
    expect(await updated.json()).toMatchObject({
      data: { title: "수정 회의록", charCount: 2 },
    });
    expect(repository.updateSource.mock.calls.at(-1)[1].char_count).toBe(2);

    const archived = await api(`/api/v1/sources/${SOURCE_ID}`, { method: "DELETE" });
    expect((await archived.json()).data.archivedAt).toBeTruthy();

    const emoji = await api(`/api/v1/projects/${PROJECT_ID}/sources`, {
      method: "POST",
      body: { kind: "note", title: "이모지", content: "😀" },
    });
    expect((await emoji.json()).data.charCount).toBe(1);
    expect(repository.createSource.mock.calls.at(-1)[1].char_count).toBe(1);
  });

  it("normalizes and atomically imports account-free Teams context", async () => {
    const response = await api(`/api/v1/projects/${PROJECT_ID}/imports`, {
      method: "POST",
      body: {
        provider: "teams",
        title: "Teams 제품 회의",
        text: JSON.stringify([
          {
            id: "message-1",
            createdDateTime: now,
            from: { user: { displayName: "민지" } },
            body: { contentType: "html", content: "<p>금요일까지 시안을 검토합니다.</p>" },
            webUrl: "https://teams.microsoft.com/l/message/message-1",
          },
        ]),
      },
    });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.data).toMatchObject({
      importId: IMPORT_ID,
      provider: "teams",
      participants: ["민지"],
      segmentCount: 1,
      duplicate: false,
      source: {
        title: "Teams 제품 회의",
        content: "민지: 금요일까지 시안을 검토합니다.",
        import: { provider: "teams", participants: ["민지"], segmentCount: 1 },
      },
    });
    expect(repository.importSourceContext).toHaveBeenCalledWith(
      PROJECT_ID,
      expect.objectContaining({
        provider: "teams",
        segments: [
          expect.objectContaining({
            externalId: "message-1",
            speaker: "민지",
            text: "금요일까지 시안을 검토합니다.",
          }),
        ],
      }),
    );
  });

  it("keeps imported source content immutable while allowing title changes", async () => {
    repository.getSource.mockResolvedValue({
      ...sourceRow(),
      source_imports: [{ id: IMPORT_ID, provider: "teams" }],
    });

    const rejected = await api(`/api/v1/sources/${SOURCE_ID}`, {
      method: "PATCH",
      body: { content: "변조된 원문" },
    });
    expect(rejected.status).toBe(409);
    await expect(rejected.json()).resolves.toMatchObject({
      error: { code: "IMPORTED_SOURCE_IMMUTABLE" },
    });
    expect(repository.updateSource).not.toHaveBeenCalled();

    const renamed = await api(`/api/v1/sources/${SOURCE_ID}`, {
      method: "PATCH",
      body: { title: "표시 제목만 변경" },
    });
    expect(renamed.status).toBe(200);
    expect(repository.updateSource).toHaveBeenCalledWith(SOURCE_ID, {
      title: "표시 제목만 변경",
    });
  });

  it("returns ordered source segments with exact external links", async () => {
    const response = await api(`/api/v1/sources/${SOURCE_ID}/segments`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [
        {
          id: SEGMENT_ID,
          sourceRecordId: SOURCE_ID,
          ordinal: 0,
          speaker: "민지",
          text: "금요일까지 시안을 검토합니다.",
          sourceUrl: "https://teams.microsoft.com/l/message/message-1",
        },
      ],
    });
  });

  it("persists an immutable analysis run, v2 evidence, and sourceIds", async () => {
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "analysis-key-1" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      id: RUN_ID,
      status: "succeeded",
      schemaVersion: "2.0",
      sourceIds: [SOURCE_ID],
      provider: { mode: "local" },
    });
    expect(body.data.result.decisions[0].id).toMatch(/^decision_/);
    expect(body.data.result.decisions[0].evidence[0]).toMatchObject({
      sourceRecordId: SOURCE_ID,
      sourceTitle: "회의록",
    });
    expect(content).toContain(body.data.result.decisions[0].evidence[0].quote);
    expect(repository.startRun).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "analysis-key-1", providerMode: "local" }),
    );
  });

  it("returns an idempotently reused run without invoking the provider", async () => {
    repository.startRun.mockResolvedValue({ reused: true, run: runRow() });
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "analysis-key-2" },
      body: { sourceIds: [SOURCE_ID], provider: "local-heuristic" },
    });
    expect(response.status).toBe(200);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("terminally cancels a newly created run when the client disconnects during start", async () => {
    let resolveStart;
    let notifyStart;
    const startEntered = new Promise((resolve) => {
      notifyStart = resolve;
    });
    repository.startRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
          notifyStart();
        }),
    );
    let notifyCompleted;
    const completed = new Promise((resolve) => {
      notifyCompleted = resolve;
    });
    repository.completeRun.mockImplementation(async (...args) => {
      notifyCompleted(args);
      return runRow({ status: args[2].status });
    });
    const pending = api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "abort-created-run" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);

    await startEntered;
    activeResponse.destroy();
    await rejected;
    resolveStart({ reused: false, run: runRow() });

    await expect(completed).resolves.toEqual([
      RUN_ID,
      USER_ID,
      expect.objectContaining({ status: "cancelled", error_code: "REQUEST_CANCELLED" }),
    ]);
    expect(analyze).not.toHaveBeenCalled();
  });

  it("does not mutate an idempotently reused run after a start-time disconnect", async () => {
    let resolveStart;
    let notifyStart;
    const startEntered = new Promise((resolve) => {
      notifyStart = resolve;
    });
    repository.startRun.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStart = resolve;
          notifyStart();
        }),
    );
    const pending = api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "abort-reused-run" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });
    const rejected = expect(pending).rejects.toBeInstanceOf(Error);

    await startEntered;
    activeResponse.destroy();
    await rejected;
    resolveStart({ reused: true, run: runRow() });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));

    expect(repository.completeRun).not.toHaveBeenCalled();
    expect(analyze).not.toHaveBeenCalled();
  });

  it("records a sanitized failed run and does not expose provider details", async () => {
    analyze.mockRejectedValue(
      Object.assign(new Error("secret provider response"), { status: 502, code: "PROVIDER_FAILED" }),
    );
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "analysis-key-3" },
      body: { sourceIds: [SOURCE_ID], mode: "openai" },
    });
    expect(response.status).toBe(502);
    const failureUpdate = repository.completeRun.mock.calls.at(-1)[2];
    expect(failureUpdate).toMatchObject({
      status: "failed",
      error_code: "PROVIDER_FAILED",
      error_message: "분석을 완료하지 못했습니다.",
    });
    expect(JSON.stringify(failureUpdate)).not.toContain("secret provider response");
  });

  it("terminalizes a new run when snapshot loading fails before provider execution", async () => {
    repository.getRunSnapshots.mockRejectedValue(
      new ApiError(503, "DATABASE_UNAVAILABLE", "database unavailable"),
    );
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "snapshot-failure" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });

    expect(response.status).toBe(503);
    expect(repository.completeRun).toHaveBeenCalledWith(
      RUN_ID,
      USER_ID,
      expect.objectContaining({ status: "failed", error_code: "DATABASE_UNAVAILABLE" }),
    );
    expect(analyze).not.toHaveBeenCalled();
  });

  it("lists/gets/deletes runs and creates/lists/revokes share links", async () => {
    const list = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`);
    expect((await list.json()).data[0].sourceIds).toEqual([SOURCE_ID]);
    expect((await (await api(`/api/v1/analysis-runs/${RUN_ID}`)).json()).data.id).toBe(RUN_ID);

    repository.getRun.mockResolvedValue(
      runRow({ status: "succeeded", result_jsonb: sampleAnalysis(), completed_at: now }),
    );
    const created = await api(`/api/v1/analysis-runs/${RUN_ID}/share-links`, {
      method: "POST",
      body: { expiresInDays: 7 },
    });
    const createdBody = await created.json();
    expect(createdBody.data.token).toBeTruthy();
    expect(createdBody.data.urlPath).toContain("/share#token=");
    expect(repository.createShareLink.mock.calls[0][2]).not.toBe(createdBody.data.token);

    expect((await (await api(`/api/v1/analysis-runs/${RUN_ID}/share-links`)).json()).data).toHaveLength(1);
    expect((await (await api(`/api/v1/share-links/${SHARE_ID}`, { method: "DELETE" })).json()).data.revokedAt).toBeTruthy();
    expect((await (await api(`/api/v1/analysis-runs/${RUN_ID}`, { method: "DELETE" })).json()).data.deleted).toBe(true);
  });

  it("resolves only a hashed public token to the sanitized shared run contract", async () => {
    const token = "a".repeat(43);
    const response = await fetch(`${baseUrl}/api/v1/shared/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Forwarded-For": "203.0.113.4" },
      body: JSON.stringify({ token }),
    });
    const body = await response.json();
    expect(body.data.projectTitle).toBe("테스트 프로젝트");
    expect(body.data).toMatchObject({
      projectTitle: "테스트 프로젝트",
      completedAt: now,
      expiresAt: "2026-07-18T00:00:00.000Z",
    });
    expect(body.data).not.toHaveProperty("run");
    expect(body.data.result.decisions[0]).not.toHaveProperty("sourceRecordId");
    expect(body.data.result.decisions[0].evidence[0]).not.toHaveProperty("sourceRecordId");
    expect(JSON.stringify(body.data)).not.toMatch(/provider|private-model|latencyMs|inputTokens|outputTokens/);
    expect(publicRepository.resolveShare).toHaveBeenCalledWith(sha256(token));
    expect(JSON.stringify(body)).not.toContain("owner_id");
  });

  it("changes the idempotency fingerprint when project or selected source semantics change", async () => {
    repository.startRun.mockResolvedValue({ reused: true, run: runRow() });
    await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "semantic-fingerprint" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });
    repository.getProject.mockResolvedValue(projectRow({ title: "바뀐 프로젝트" }));
    repository.getSources.mockResolvedValue([
      sourceRow({ title: "바뀐 기록", kind: "feedback", content_sha256: "f".repeat(64) }),
    ]);
    await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "semantic-fingerprint" },
      body: { sourceIds: [SOURCE_ID], mode: "local" },
    });
    expect(repository.startRun.mock.calls[0][0].requestFingerprint).not.toBe(
      repository.startRun.mock.calls[1][0].requestFingerprint,
    );
  });

  it("marks a newly created OpenAI run failed when a service-only global/IP limit denies it", async () => {
    repository.consumeOpenAIRateLimit.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const response = await api(`/api/v1/projects/${PROJECT_ID}/analysis-runs`, {
      method: "POST",
      headers: { "Idempotency-Key": "openai-rate-limited" },
      body: { sourceIds: [SOURCE_ID], mode: "openai" },
    });
    expect(response.status).toBe(429);
    expect(analyze).not.toHaveBeenCalled();
    expect(repository.completeRun).toHaveBeenCalledWith(
      RUN_ID,
      USER_ID,
      expect.objectContaining({ status: "failed", error_code: "OPENAI_RATE_LIMITED" }),
    );
  });

  it("rejects cross-origin mutations and malformed payloads", async () => {
    const crossOrigin = await api("/api/v1/projects", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
      body: { title: "프로젝트", description: "" },
    });
    expect(crossOrigin.status).toBe(403);

    const spoofedForwardedHost = await api("/api/v1/projects", {
      method: "POST",
      headers: {
        Origin: "https://attacker.example",
        "X-Forwarded-Host": "attacker.example",
        "X-Forwarded-Proto": "https",
      },
      body: { title: "프로젝트", description: "" },
    });
    expect(spoofedForwardedHost.status).toBe(403);

    const invalid = await api(`/api/v1/projects/${PROJECT_ID}/sources`, {
      method: "POST",
      body: { kind: "unknown", title: "x", content: "x" },
    });
    expect(invalid.status).toBe(400);
  });
});

function api(path, options = {}) {
  const headers = { Authorization: "Bearer valid-token", ...(options.headers || {}) };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

function createFakeRepository() {
  let project = projectRow();
  let source = sourceRow();
  let run = runRow();
  let share = shareRow();
  const snapshots = [snapshotRow()];
  return {
    listProjects: vi.fn(async () => [project]),
    createProject: vi.fn(async (_userId, values) => (project = projectRow(values))),
    getProject: vi.fn(async () => project),
    updateProject: vi.fn(async (_id, values) => (project = { ...project, ...values })),
    archiveProject: vi.fn(async () => (project = { ...project, archived_at: now })),
    deleteProject: vi.fn(async () => undefined),
    listSources: vi.fn(async () => [source]),
    createSource: vi.fn(async (_projectId, values) => (source = sourceRow(values))),
    importSourceContext: vi.fn(async (_projectId, values) => {
      source = sourceRow({
        kind: values.kind,
        title: values.title,
        content: values.content,
        occurred_at: values.occurredAt,
      });
      return {
        source,
        import_id: IMPORT_ID,
        provider: values.provider,
        participants: values.participants,
        segment_count: values.segments.length,
        imported_at: now,
        metadata: values.metadata,
        duplicate: false,
      };
    }),
    getSource: vi.fn(async () => source),
    getSources: vi.fn(async () => [source]),
    updateSource: vi.fn(async (_id, values) => (source = { ...source, ...values })),
    archiveSource: vi.fn(async () => (source = { ...source, archived_at: now })),
    listSourceSegments: vi.fn(async () => [
      {
        id: SEGMENT_ID,
        source_record_id: SOURCE_ID,
        ordinal: 0,
        speaker: "민지",
        text: "금요일까지 시안을 검토합니다.",
        occurred_at: now,
        external_id: "message-1",
        source_url: "https://teams.microsoft.com/l/message/message-1",
      },
    ]),
    listRuns: vi.fn(async () => [run]),
    getRun: vi.fn(async () => run),
    startRun: vi.fn(async () => ({ reused: false, run })),
    getRunSnapshots: vi.fn(async () => snapshots),
    completeRun: vi.fn(async (_id, _userId, values) => (run = { ...run, ...values })),
    deleteRun: vi.fn(async () => undefined),
    listShareLinks: vi.fn(async () => [share]),
    createShareLink: vi.fn(async (_runId, _userId, _hash, expiresAt) => (share = shareRow({ expires_at: expiresAt }))),
    revokeShareLink: vi.fn(async () => (share = { ...share, revoked_at: now })),
    consumeOpenAIRateLimit: vi.fn(async () => true),
  };
}

function projectRow(values = {}) {
  return {
    id: PROJECT_ID,
    owner_id: USER_ID,
    title: "테스트 프로젝트",
    description: "",
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...values,
  };
}

function sourceRow(values = {}) {
  const value = values.content || content;
  return {
    id: SOURCE_ID,
    project_id: PROJECT_ID,
    kind: "meeting",
    title: "회의록",
    content: value,
    content_sha256: values.content_sha256 || sha256(value),
    char_count: values.char_count ?? Array.from(value).length,
    occurred_at: now,
    archived_at: null,
    created_at: now,
    updated_at: now,
    ...values,
  };
}

function snapshotRow() {
  return {
    source_record_id: SOURCE_ID,
    source_title: "회의록",
    source_kind: "meeting",
    content_snapshot: content,
    content_sha256: sha256(content),
    char_count: content.length,
  };
}

function runRow(values = {}) {
  return {
    id: RUN_ID,
    project_id: PROJECT_ID,
    created_by: USER_ID,
    status: "running",
    schema_version: "2.0",
    provider_mode: "local",
    provider_model: null,
    result_jsonb: null,
    error_code: null,
    error_message: null,
    latency_ms: null,
    input_tokens: null,
    output_tokens: null,
    created_at: now,
    started_at: now,
    completed_at: null,
    analysis_run_sources: [{ source_record_id: SOURCE_ID }],
    ...values,
  };
}

function shareRow(values = {}) {
  return {
    id: SHARE_ID,
    analysis_run_id: RUN_ID,
    expires_at: "2026-07-18T00:00:00.000Z",
    revoked_at: null,
    created_at: now,
    ...values,
  };
}

function sampleAnalysis() {
  return {
    projectTitle: "테스트 프로젝트",
    summary: { projectTitle: "테스트 프로젝트", overview: ["입력 흐름을 정리했다."], sourceLength: content.length, generatedAt: now },
    keyTerms: [{ term: "입력", meaning: "프로젝트 기록" }],
    decisions: [{ decision: "직접 입력 방식으로 시작하기로 결정했다.", reason: "빠른 검증", status: "confirmed" }],
    participants: [{ actor: "민지", role: "기획", focus: "입력 흐름", concern: "복잡성", question: "어떻게 단순화할까?" }],
    questions: [{ question: "공유 범위는?", reason: "검토 필요", ownerHint: "팀" }],
    knowledgeMap: { nodes: [{ id: "topic-main", label: "테스트", type: "topic", summary: "입력 흐름" }], links: [] },
    onboardingSummary: { items: ["요약"], currentDecisions: [], remainingQuestions: [], shareText: "공유" },
    participantAgents: { views: [{ actor: "민지", role: "기획", priority: "입력", interpretation: "단순화", evidence: ["민지는 입력 흐름을 단순하게 만들자고 제안했다."], risk: "복잡성" }], agreementPoints: [], tensionPoints: [], privacyNote: "기록만 사용" },
    provider: { mode: "mock", name: "local-heuristic", usedExternalModel: false },
  };
}
