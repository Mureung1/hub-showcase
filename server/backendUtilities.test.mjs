// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { ApiError, toApiError } from "./apiErrors.mjs";
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
  rateLimitIdentifier,
  requireUuid,
  sanitizeAccountExportPayload,
  sha256,
  writeStructuredLog,
} from "./security.mjs";

describe("backend resource mappers", () => {
  it("maps optional project/source fields without leaking database naming", () => {
    expect(
      projectResource({
        id: "p",
        owner_id: "u",
        title: "title",
        description: null,
        retention_days: 90,
        archived_at: null,
        created_at: "created",
        updated_at: "updated",
      }),
    ).toMatchObject({
      ownerId: "u",
      description: "",
      retentionDays: 90,
      archivedAt: null,
    });

    const source = {
      id: "s",
      project_id: "p",
      kind: "note",
      title: "source",
      content: "private",
      content_sha256: "hash",
      char_count: 7,
      occurred_at: null,
      archived_at: null,
      created_at: "created",
      updated_at: "updated",
    };
    expect(sourceResource(source)).toMatchObject({ content: "private", projectId: "p" });
    expect(sourceResource(source, { includeContent: false })).not.toHaveProperty("content");
  });

  it("maps provider models, source arrays, results and sanitized failures", () => {
    const base = {
      id: "r",
      project_id: "p",
      status: "succeeded",
      schema_version: "2.0",
      provider_mode: "openai",
      provider_model: "gpt-5.6-terra",
      result_jsonb: {
        summary: "ok",
        decisions: [{ evidence: [{ quote: "결정 근거" }] }],
        participants: [{ evidence: [] }],
        questions: [],
        keyTerms: [{ evidence: [{ quote: "핵심어 근거" }] }],
      },
      error_code: null,
      latency_ms: 1,
      input_tokens: 2,
      output_tokens: 3,
      created_at: "created",
      started_at: "started",
      completed_at: "completed",
      source_ids: ["one"],
      analysis_run_step_events: [
        {
          sequence: 2,
          step_name: "source_snapshot",
          status: "succeeded",
          validation_outcome: "passed",
          code: "SNAPSHOT_READY",
          duration_ms: 8,
        },
        {
          sequence: 1,
          step_name: "source_snapshot",
          status: "started",
          validation_outcome: null,
          code: null,
          duration_ms: null,
        },
      ],
    };
    expect(analysisRunResource(base)).toMatchObject({
      pipelineVersion: "2.0",
      stages: [
        {
          name: "source_snapshot",
          status: "started",
          validationOutcome: null,
          code: null,
          durationMs: null,
        },
        {
          name: "source_snapshot",
          status: "succeeded",
          validationOutcome: "passed",
          code: "SNAPSHOT_READY",
          durationMs: 8,
        },
      ],
      evidenceCoverage: { eligible: 3, validated: 2 },
      sourceIds: ["one"],
      provider: { mode: "openai", model: "gpt-5.6-terra" },
      result: expect.objectContaining({ summary: "ok" }),
    });

    const failed = analysisRunResource({
      ...base,
      status: "failed",
      provider_model: null,
      result_jsonb: null,
      source_ids: undefined,
      analysis_run_sources: undefined,
      error_code: "ANALYSIS_FAILED",
      error_message: null,
    });
    expect(failed.sourceIds).toEqual([]);
    expect(failed.provider).toEqual({ mode: "openai" });
    expect(failed.pipelineVersion).toBe("2.0");
    expect(failed.stages.map((stage) => stage.status)).toEqual(["started", "succeeded"]);
    expect(failed.evidenceCoverage).toEqual({ eligible: 0, validated: 0 });
    expect(failed).not.toHaveProperty("result");
    expect(failed.error.message).toBe("분석에 실패했습니다.");
  });

  it("maps share metadata", () => {
    expect(
      shareLinkResource({
        id: "share",
        analysis_run_id: "run",
        disclosure_mode: "evidence",
        include_project_title: true,
        expires_at: "expires",
        revoked_at: null,
        created_at: "created",
      }),
    ).toEqual({
      id: "share",
      analysisRunId: "run",
      disclosureMode: "evidence",
      includeProjectTitle: true,
      expiresAt: "expires",
      revokedAt: null,
      createdAt: "created",
    });
  });

  it("removes names, evidence, provider data, and source identifiers from summary shares", () => {
    const shared = sharedAnalysisResource({
      project_title: "public project",
      disclosure_mode: "summary",
      include_project_title: false,
      result_jsonb: {
        provider: { model: "private" },
        sourceIds: ["source-id"],
        participants: [{ name: "민지" }],
        summary: { overview: ["민지가 결정 내용을 정리했다."] },
        decisions: [
          {
            id: "stable-item-id",
            decision: "민지가 승인했다.",
            evidence: [{ sourceRecordId: "source-id", sourceTitle: "회의록", quote: "근거" }],
          },
        ],
      },
      completed_at: "completed",
      expires_at: "expires",
    });
    expect(shared).toMatchObject({
      projectTitle: null,
      disclosureMode: "summary",
      completedAt: "completed",
      expiresAt: "expires",
    });
    expect(shared.result.decisions[0].id).toBe("stable-item-id");
    expect(shared.result.decisions[0].decision).toBe("참여자 1가 승인했다.");
    expect(shared.result.decisions[0]).not.toHaveProperty("evidence");
    expect(shared.result.summary.overview[0]).toBe("참여자 1가 결정 내용을 정리했다.");
    expect(shared.result.participants).toEqual([]);
    expect(JSON.stringify(shared)).not.toMatch(
      /provider|private|source-id|sourceRecordId|sourceIds|sourceTitle|quote|회의록|근거/,
    );
  });

  it("keeps exact evidence only in acknowledged evidence shares", () => {
    const shared = sharedAnalysisResource({
      project_title: "public project",
      disclosure_mode: "evidence",
      include_project_title: true,
      result_jsonb: {
        provider: { model: "private" },
        participants: [{ name: "민지" }],
        decisions: [
          {
            id: "stable-item-id",
            decision: "민지가 승인했다.",
            evidence: [
              {
                sourceRecordId: "source-id",
                sourceTitle: "회의록",
                quote: "민지가 승인했다.",
              },
            ],
          },
        ],
      },
      completed_at: "completed",
      expires_at: "expires",
    });
    expect(shared).toMatchObject({
      projectTitle: "public project",
      disclosureMode: "evidence",
      completedAt: "completed",
      expiresAt: "expires",
    });
    expect(shared.result.decisions[0].decision).toBe("참여자 1가 승인했다.");
    expect(shared.result.decisions[0].evidence[0]).toEqual({
      sourceTitle: "회의록",
      quote: "민지가 승인했다.",
    });
    expect(shared.result.participants).toEqual([]);
    expect(JSON.stringify(shared)).not.toMatch(/provider|private|source-id|sourceRecordId|sourceIds/);
  });
});

describe("backend security utilities", () => {
  it("creates opaque hashes, stable privacy identifiers, and 256-bit share tokens", () => {
    expect(sha256("value")).toHaveLength(64);
    expect(privacyIdentifier("user", "secret")).toBe(privacyIdentifier("user", "secret"));
    expect(privacyIdentifier("user", "secret")).not.toBe(privacyIdentifier("other", "secret"));
    expect(createShareToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("validates UUIDs and trusts forwarding headers only for the declared platform", () => {
    const uuid = "33333333-3333-4333-8333-333333333333";
    expect(requireUuid(uuid)).toBe(uuid);
    expect(() => requireUuid("not-an-id", "sourceId")).toThrow(
      expect.objectContaining({ status: 400, code: "INVALID_IDENTIFIER" }),
    );
    expect(
      clientIp({ headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.1" }, socket: {} }),
    ).toBe("unknown");
    expect(
      clientIp(
        { headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.1" }, socket: {} },
        { platform: "trusted-proxy" },
      ),
    ).toBe("203.0.113.1");
    expect(
      clientIp(
        { headers: { "x-forwarded-for": "198.51.100.9, 203.0.113.1" }, socket: {} },
        { platform: "render" },
      ),
    ).toBe("198.51.100.9");
    expect(
      clientIp({
        headers: {
          "cf-connecting-ip": "192.0.2.8",
          "x-forwarded-for": "198.51.100.9, 203.0.113.1",
        },
        socket: {},
      }, { platform: "cloudflare" }),
    ).toBe("192.0.2.8");
    expect(
      clientIp({
        trustedProxyPlatform: "cloudflare",
        headers: {
          "cf-connecting-ip": "198.51.100.7",
          "x-forwarded-for": "192.0.2.99, 198.51.100.7",
        },
        socket: {},
      }),
    ).toBe("198.51.100.7");
    expect(clientIp({ headers: { "x-forwarded-for": "spoofed" }, socket: {} })).toBe("unknown");
    expect(clientIp({ headers: {}, socket: { remoteAddress: "127.0.0.1" } })).toBe("127.0.0.1");
    expect(clientIp({ headers: {}, socket: {} })).toBe("unknown");
  });

  it("uses secret-keyed identifiers and fails closed without a production secret", () => {
    const request = {
      headers: { "cf-connecting-ip": "203.0.113.7" },
      socket: {},
      trustedProxyPlatform: "cloudflare",
    };
    const identifier = rateLimitIdentifier(request, { secret: "test-secret" });
    expect(identifier).toHaveLength(64);
    expect(identifier).toBe(rateLimitIdentifier(request, { secret: "test-secret" }));
    expect(identifier).not.toContain("203.0.113.7");

    vi.stubEnv("IP_HASH_SECRET", "");
    vi.stubEnv("RATE_LIMIT_IDENTIFIER_SECRET", "");
    vi.stubEnv("SAFETY_IDENTIFIER_SECRET", "");
    try {
      expect(() => rateLimitIdentifier(request, { nodeEnv: "production" })).toThrow(
        expect.objectContaining({ status: 503, code: "RATE_LIMIT_IDENTIFIER_SECRET_MISSING" }),
      );
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("writes structured logs without request content or high-cardinality identifiers", () => {
    const logger = { info: vi.fn() };
    const payload = writeStructuredLog(
      {
        requestId: "request-1",
        cfRay: "ray-1",
        rndrId: "render-1",
        method: "POST",
        route: "/api/v1/projects/33333333-3333-4333-8333-333333333333?email=private@example.com",
        status: 201,
        durationMs: 3.14159,
      },
      { logger },
    );
    expect(payload.route).toBe("/api/v1/projects/:id");
    expect(JSON.stringify(payload)).not.toContain("private@example.com");
    expect(logger.info).toHaveBeenCalledOnce();
  });

  it("removes credentials from account exports and adds only the verified email", () => {
    expect(
      sanitizeAccountExportPayload(
        {
          projects: [{ id: "p1", token_hash: "private" }],
          refresh_token: "private",
          nested: { serviceRoleKey: "private", content: "kept" },
          email: "unverified@example.com",
        },
        "verified@example.com",
      ),
    ).toEqual({
      projects: [{ id: "p1" }],
      nested: { content: "kept" },
      email: "verified@example.com",
    });
  });
});

describe("API error sanitization", () => {
  it("preserves explicit API errors and sanitizes typed upstream errors", () => {
    const explicit = new ApiError(409, "CONFLICT", "safe");
    expect(toApiError(explicit)).toBe(explicit);
    expect(toApiError({ status: 400, code: "BAD_REQUEST", message: "private detail" })).toMatchObject({
      status: 400,
      code: "BAD_REQUEST",
      message: "요청을 처리할 수 없습니다.",
    });
    expect(toApiError({ status: 503, code: "UPSTREAM_FAILED", message: "private detail" })).toMatchObject({
      status: 503,
      code: "UPSTREAM_FAILED",
      message: "외부 분석 서비스를 완료하지 못했습니다.",
    });
  });

  it("maps aborts and unknown failures without exposing their messages", () => {
    expect(toApiError({ name: "AbortError", message: "secret" })).toMatchObject({
      status: 499,
      code: "REQUEST_CANCELLED",
    });
    expect(toApiError(new Error("database password"))).toMatchObject({
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
