import { describe, expect, it, vi } from "vitest";
import {
  handleReleaseGateRequest,
  type ReleaseGateDependencies,
  type ReleaseGateEnv
} from "../src/release-gate/worker";
import { FixtureWorkflowContentVerifier } from "../src/release-gate/workflow-verifier";
import { APPROVED_SHA, NOW_EPOCH_SECONDS, passedCanarySummary, validGithubPayload } from "./fixtures";

describe("Release Gate HTTP 경계", () => {
  it("POST /v1/live-checks/naver의 approvedSha만 받아 OIDC·workflow·replay 후 호출한다", async () => {
    const tokenIssuer = vi.fn(async () => "signed-gateway-token");
    const gatewayRun = vi.fn(async () => passedCanarySummary());
    const response = await handleReleaseGateRequest(
      liveRequest({ approvedSha: APPROVED_SHA }),
      env(),
      {
        ...approvedDependencies(),
        gatewayClient: { run: gatewayRun },
        tokenIssuer: { issue: tokenIssuer }
      }
    );

    expect(response.status).toBe(200);
    expect(tokenIssuer).toHaveBeenCalledWith(APPROVED_SHA, NOW_EPOCH_SECONDS);
    expect(gatewayRun).toHaveBeenCalledWith("signed-gateway-token", APPROVED_SHA);
    expect(await response.json()).toMatchObject({ callCount: 2, status: "passed" });
  });

  it.each([
    { approvedSha: APPROVED_SHA, query: "사용자 입력 금지" },
    { approvedSha: APPROVED_SHA, display: 1 },
    { approvedSha: "main" }
  ])("외부 body가 정확히 approvedSha 하나가 아니면 거부한다", async (body) => {
    const response = await handleReleaseGateRequest(liveRequest(body), env(), approvedDependencies());
    expect(response.status).toBe(400);
  });

  it("workflow token/hash 미설정 시 기본 verifier가 외부 호출 없이 fail closed 한다", async () => {
    const workflowFetch = vi.fn(async () => new Response("unexpected"));
    const response = await handleReleaseGateRequest(liveRequest({ approvedSha: APPROVED_SHA }), env(), {
      nowEpochSeconds: () => NOW_EPOCH_SECONDS,
      oidcVerifier: { verify: async () => validGithubPayload() },
      replayStore: { consume: async () => true },
      workflowFetch
    });

    expect(response.status).toBe(403);
    expect(workflowFetch).not.toHaveBeenCalled();
  });

  it("OIDC jti 재사용을 Gateway 호출 전에 차단한다", async () => {
    const gatewayRun = vi.fn(async () => passedCanarySummary());
    const response = await handleReleaseGateRequest(
      liveRequest({ approvedSha: APPROVED_SHA }),
      env(),
      {
        ...approvedDependencies(),
        gatewayClient: { run: gatewayRun },
        replayStore: { consume: async () => false }
      }
    );

    expect(response.status).toBe(409);
    expect(gatewayRun).not.toHaveBeenCalled();
  });

  it("Bearer token이 없으면 body를 읽기 전에 거부한다", async () => {
    const request = new Request("https://release-gate.invalid/v1/live-checks/naver", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approvedSha: APPROVED_SHA })
    });

    const response = await handleReleaseGateRequest(request, env(), approvedDependencies());

    expect(response.status).toBe(401);
  });
});

function liveRequest(body: Record<string, unknown>): Request {
  return new Request("https://release-gate.invalid/v1/live-checks/naver", {
    method: "POST",
    headers: {
      authorization: "Bearer github-oidc-fixture",
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function env(): ReleaseGateEnv {
  return { REPLAY_STORE: {} as DurableObjectNamespace };
}

function approvedDependencies(): ReleaseGateDependencies {
  return {
    nowEpochSeconds: () => NOW_EPOCH_SECONDS,
    oidcVerifier: { verify: async () => validGithubPayload() },
    replayStore: { consume: async () => true },
    tokenIssuer: { issue: async () => "signed-gateway-token" },
    workflowVerifier: new FixtureWorkflowContentVerifier(APPROVED_SHA)
  };
}
