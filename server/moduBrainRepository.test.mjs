// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import {
  createModuBrainRepository,
  createModuBrainServiceRepository,
  createPublicShareRepository,
} from "./moduBrainRepository.mjs";

const ID = "22222222-2222-4222-8222-222222222222";

describe("Modu Brain PostgREST repository", () => {
  it("covers owner-scoped CRUD, transactional runs, shares, readiness, and limits", async () => {
    const project = { id: ID, title: "project" };
    const source = { id: ID, project_id: ID, content: "text" };
    const run = { id: ID, project_id: ID, analysis_run_sources: [{ source_record_id: ID }] };
    const snapshot = { source_record_id: ID, content_snapshot: "text" };
    const segment = { id: ID, source_record_id: ID, ordinal: 0, text: "text" };
    const stepEvent = { id: ID, analysis_run_id: ID, event_key: "source_snapshot:succeeded" };
    const annotation = { id: ID, analysis_run_id: ID, annotation_type: "note" };
    const share = { id: ID, analysis_run_id: ID };
    const request = vi.fn(async (path) => {
      if (path === "rpc/start_analysis_run") return [{ outcome: "created", run: { id: ID } }];
      if (path === "rpc/create_analysis_run_annotation") {
        return [{ outcome: "created", annotation }];
      }
      if (path === "rpc/import_source_context") {
        return { source, import_id: ID, provider: "paste", segment_count: 1 };
      }
      if (path === "rpc/consume_rate_limit") return true;
      if (path.startsWith("projects")) return [project];
      if (path.startsWith("source_records")) return [source];
      if (path.startsWith("source_segments")) return [segment];
      if (path.startsWith("analysis_runs")) return [run];
      if (path.startsWith("analysis_run_sources")) return [snapshot];
      if (path.startsWith("analysis_run_step_events")) return [stepEvent];
      if (path.startsWith("analysis_run_annotations")) return [annotation];
      if (path.startsWith("share_links")) return [share];
      return [];
    });
    const repository = createModuBrainRepository({ request });

    await expect(repository.ready()).resolves.toBe(true);
    await expect(repository.listProjects()).resolves.toEqual([project]);
    await expect(repository.createProject("user", { title: "p", description: "d" })).resolves.toBe(project);
    await expect(repository.getProject(ID)).resolves.toBe(project);
    await expect(repository.updateProject(ID, { title: "updated" })).resolves.toBe(project);
    await expect(repository.archiveProject(ID)).resolves.toBe(project);
    await expect(repository.deleteProject(ID)).resolves.toBeUndefined();

    await expect(repository.listSources(ID)).resolves.toEqual([source]);
    await expect(repository.createSource(ID, { title: "source" })).resolves.toBe(source);
    await expect(
      repository.importSourceContext(ID, {
        kind: "note",
        title: "import",
        content: "text",
        occurredAt: null,
        provider: "paste",
        externalId: "paste:source:1",
        participants: [],
        metadata: {},
        segments: [{ externalId: "segment-1", text: "text" }],
      }),
    ).resolves.toMatchObject({ import_id: ID, provider: "paste" });
    await expect(repository.getSource(ID)).resolves.toBe(source);
    await expect(repository.getSources(ID, [ID])).resolves.toEqual([source]);
    await expect(repository.getSources(ID, [])).resolves.toEqual([]);
    await expect(repository.updateSource(ID, { title: "updated" })).resolves.toBe(source);
    await expect(repository.archiveSource(ID)).resolves.toBe(source);
    await expect(repository.listSourceSegments(ID)).resolves.toEqual([segment]);

    await expect(repository.listRuns(ID)).resolves.toEqual([run]);
    await expect(repository.getRun(ID)).resolves.toBe(run);
    await expect(
      repository.startRun({
        projectId: ID,
        sourceIds: [ID],
        idempotencyKey: "abcdefgh",
        requestFingerprint: "a".repeat(64),
        providerMode: "local",
        providerModel: null,
      }),
    ).resolves.toEqual({ reused: false, run });
    await expect(repository.deleteRun(ID)).resolves.toBeUndefined();
    await expect(repository.getRunSnapshots(ID)).resolves.toEqual([snapshot]);
    await expect(repository.listRunStepEvents(ID)).resolves.toEqual([stepEvent]);
    await expect(repository.listRunAnnotations(ID)).resolves.toEqual([annotation]);
    await expect(
      repository.createRunAnnotation(ID, {
        idempotencyKey: "annotation-key",
        annotationType: "note",
        targetType: "run",
        targetId: null,
        body: "feedback",
      }),
    ).resolves.toEqual({ reused: false, annotation });

    await expect(repository.listShareLinks(ID)).resolves.toEqual([share]);
    await expect(repository.consumeRateLimit("analysis:hour", "user", 10, 3600)).resolves.toBe(true);

    expect(request).toHaveBeenCalledWith(
      "rpc/start_analysis_run",
      expect.objectContaining({ method: "POST", body: expect.objectContaining({ p_project_id: ID }) }),
    );
    expect(request).toHaveBeenCalledWith(
      "rpc/import_source_context",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ p_project_id: ID, p_provider: "paste" }),
      }),
    );
    expect(request).toHaveBeenCalledWith(
      "rpc/create_analysis_run_annotation",
      expect.objectContaining({
        method: "POST",
        body: expect.objectContaining({ p_analysis_run_id: ID, p_target_type: "run" }),
      }),
    );
  });

  it("uses narrowly filtered service-role writes for completion and share mutations", async () => {
    const run = { id: ID, status: "succeeded" };
    const stepEvent = { id: ID, analysis_run_id: ID, event_key: "source_snapshot:succeeded" };
    const share = { id: ID, analysis_run_id: ID };
    const request = vi.fn(async (path) => {
      if (path === "rpc/consume_openai_rate_limit") return true;
      if (path.startsWith("analysis_run_step_events")) return [stepEvent];
      if (path.startsWith("analysis_runs")) return [run];
      if (path.startsWith("share_links")) return [share];
      return [];
    });
    const repository = createModuBrainServiceRepository({ request });
    const completedAt = new Date().toISOString();

    await expect(
      repository.appendRunStepEvent(ID, "user-id", {
        sequence: 1,
        eventKey: "source_snapshot:succeeded",
        step: "source_snapshot",
        status: "succeeded",
        code: "SNAPSHOT_READY",
        durationMs: 3,
        sourceCount: 1,
        inputCharacters: 4,
      }),
    ).resolves.toBe(stepEvent);

    await expect(
      repository.completeRun(ID, "user-id", {
        status: "succeeded",
        result_jsonb: { ok: true },
        latency_ms: 5,
        completed_at: completedAt,
      }),
    ).resolves.toBe(run);
    await expect(
      repository.completeRun(ID, "user-id", {
        status: "failed",
        error_code: "FAILED",
        error_message: "safe",
        latency_ms: 6,
        completed_at: completedAt,
      }),
    ).resolves.toBe(run);
    await expect(
      repository.createShareLink(ID, "user-id", "a".repeat(64), completedAt),
    ).resolves.toBe(share);
    await expect(repository.revokeShareLink(ID, "user-id")).resolves.toBe(share);
    await expect(
      repository.consumeOpenAIRateLimit("openai:global:day", "global"),
    ).resolves.toBe(true);

    expect(request).toHaveBeenCalledWith(
      expect.stringContaining(`id=eq.${ID}&created_by=eq.user-id&status=eq.running`),
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining("analysis_run_step_events?on_conflict=analysis_run_id,event_key"),
      expect.objectContaining({
        method: "POST",
        prefer: "resolution=ignore-duplicates,return=representation",
        body: expect.not.objectContaining({ rawText: expect.anything(), reasoning: expect.anything() }),
      }),
    );
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining(`id=eq.${ID}&created_by=eq.user-id&status=eq.succeeded`),
    );
    expect(request).toHaveBeenCalledWith(
      expect.stringContaining(`id=eq.${ID}&created_by=eq.user-id&revoked_at=is.null`),
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("turns empty owner-scoped results into a non-enumerating 404", async () => {
    const repository = createModuBrainRepository({ request: vi.fn().mockResolvedValue([]) });
    await expect(repository.getProject(ID)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    await expect(repository.deleteRun(ID)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("uses service-only RPCs for public share resolution and IP limits", async () => {
    const request = vi.fn(async (path) => {
      if (path === "rpc/resolve_shared_analysis") return [{ project_title: "project" }];
      return [{ consume_public_rate_limit: true }];
    });
    const repository = createPublicShareRepository({ request });
    await expect(repository.resolveShare("hash")).resolves.toEqual({ project_title: "project" });
    await expect(repository.consumeRateLimit("share:hour", "iphash", 60, 3600)).resolves.toBe(true);
  });
});
