import { describe, expect, it, vi } from "vitest";
import {
  handleProviderGatewayRequest,
  type ProviderGatewayDependencies,
  type ProviderGatewayEnv
} from "../src/provider-gateway/worker";
import type { GatewayScope } from "../src/shared/gateway-token";
import type { ReplayStore } from "../src/shared/replay";
import {
  PROVIDER_GATEWAY_BLOG_SCOPE,
  PROVIDER_GATEWAY_LOCAL_SCOPE,
  PROVIDER_GATEWAY_SCOPE
} from "../src/shared/constants";
import { APPROVED_SHA, GATEWAY_JTI, jsonResponse, naverPayload } from "./fixtures";

describe("Provider Gateway HTTP 경계", () => {
  it.each([
    ["/search/v1/local", "local", 5, PROVIDER_GATEWAY_LOCAL_SCOPE],
    ["/search/v1/blog", "blog", 10, PROVIDER_GATEWAY_BLOG_SCOPE]
  ] as const)("GET %s는 고정 Naver host/path와 endpoint별 display 상한만 전달한다", async (
    path,
    endpoint,
    display,
    scope
  ) => {
    let upstreamUrl: URL | undefined;
    let upstreamInit: RequestInit | undefined;
    const response = await handleProviderGatewayRequest(
      new Request(
        `https://gateway.invalid${path}?query=서울%20카페&display=${display}`,
        {
          headers: {
            authorization: "Bearer fixture-token",
            "x-ncp-apigw-api-key": "attacker-secret",
            "x-ncp-apigw-api-key-id": "attacker-id"
          }
        }
      ),
      env(),
      dependencies(scope, async (input, init) => {
        upstreamUrl = new URL(String(input));
        upstreamInit = init;
        return jsonResponse(naverPayload(endpoint));
      })
    );

    expect(response.status).toBe(200);
    expect(upstreamUrl?.origin).toBe("https://naverapihub.apigw.ntruss.com");
    expect(upstreamUrl?.pathname).toBe(path);
    expect(Array.from(upstreamUrl?.searchParams.keys() ?? []).sort()).toEqual([
      "display",
      "query"
    ]);
    const headers = new Headers(upstreamInit?.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("x-ncp-apigw-api-key-id")).toBe("gateway-key-id-123456");
    expect(headers.get("x-ncp-apigw-api-key")).toBe("gateway-secret-key-123456");
    expect(upstreamInit?.redirect).toBe("error");
  });

  it.each([
    ["/search/v1/local?query=test&display=6", PROVIDER_GATEWAY_LOCAL_SCOPE],
    ["/search/v1/blog?query=test&display=11", PROVIDER_GATEWAY_BLOG_SCOPE],
    ["/search/v1/local?query=test&display=1&start=1", PROVIDER_GATEWAY_LOCAL_SCOPE],
    ["/search/v1/local?query=test&display=1&display=2", PROVIDER_GATEWAY_LOCAL_SCOPE]
  ] as const)("허용 목록 밖 query를 upstream 전에 거부한다: %s", async (path, scope) => {
    const upstream = vi.fn(async () => jsonResponse(naverPayload("local")));
    const response = await handleProviderGatewayRequest(
      new Request(`https://gateway.invalid${path}`, {
        headers: { authorization: "Bearer fixture-token" }
      }),
      env(),
      dependencies(scope, upstream)
    );

    expect(response.status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("경로와 scope가 일치하지 않으면 upstream 전에 거부한다", async () => {
    const upstream = vi.fn(async () => jsonResponse(naverPayload("local")));
    const response = await handleProviderGatewayRequest(
      new Request("https://gateway.invalid/search/v1/local?query=test&display=1", {
        headers: { authorization: "Bearer fixture-token" }
      }),
      env(),
      dependencies(PROVIDER_GATEWAY_BLOG_SCOPE, upstream)
    );

    expect(response.status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("재사용된 Gateway jti는 upstream 전에 거부한다", async () => {
    const upstream = vi.fn(async () => jsonResponse(naverPayload("local")));
    const response = await handleProviderGatewayRequest(
      new Request("https://gateway.invalid/search/v1/local?query=test&display=1", {
        headers: { authorization: "Bearer fixture-token" }
      }),
      env(),
      {
        ...dependencies(PROVIDER_GATEWAY_LOCAL_SCOPE, upstream),
        replayStore: { consume: async () => false }
      }
    );

    expect(response.status).toBe(409);
    expect(upstream).not.toHaveBeenCalled();
  });

  it.each(["/v1/naver/local", "/v1/naver/blog", "/v1/consume"])(
    "이전 alias와 Durable Object 내부 경로를 공개하지 않는다: %s",
    async (path) => {
      const response = await handleProviderGatewayRequest(
        new Request(`https://gateway.invalid${path}`),
        env()
      );
      expect(response.status).toBe(404);
    }
  );

  it.each([
    ["POST", "/search/v1/local?query=test&display=1"],
    ["PUT", "/search/v1/blog?query=test&display=1"],
    ["GET", "/v1/canaries/naver"]
  ])("허용하지 않은 method·route 조합을 거부한다: %s %s", async (method, path) => {
    const response = await handleProviderGatewayRequest(
      new Request(`https://gateway.invalid${path}`, { method }),
      env()
    );
    expect(response.status).toBe(404);
  });

  it("내부 canary는 고정 입력으로 Local/Blog를 순차 두 번 호출한다", async () => {
    const events: string[] = [];
    const response = await handleProviderGatewayRequest(
      new Request("https://gateway.invalid/v1/canaries/naver", {
        method: "POST",
        headers: {
          authorization: "Bearer fixture-token",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          approvedSha: APPROVED_SHA,
          display: 1,
          query: "서울 카페"
        })
      }),
      env(),
      {
        ...dependencies(PROVIDER_GATEWAY_SCOPE, async (input) => {
          const endpoint = new URL(String(input)).pathname.endsWith("local") ? "local" : "blog";
          events.push(endpoint);
          return jsonResponse(naverPayload(endpoint));
        }),
        sleep: async (milliseconds) => {
          events.push(`sleep:${milliseconds}`);
        }
      }
    );

    expect(response.status).toBe(200);
    expect(events).toEqual(["local", "sleep:1000", "blog"]);
    expect(await response.json()).toMatchObject({ callCount: 2, status: "passed" });
  });
});

function env(): ProviderGatewayEnv {
  return {
    NAVER_API_HUB_KEY: "gateway-secret-key-123456",
    NAVER_API_HUB_KEY_ID: "gateway-key-id-123456",
    REPLAY_STORE: {} as DurableObjectNamespace
  };
}

function dependencies(
  scope: GatewayScope,
  fetchImplementation: NonNullable<ProviderGatewayDependencies["fetchImplementation"]>
): ProviderGatewayDependencies {
  const replayStore: ReplayStore = { consume: async () => true };
  return {
    fetchImplementation,
    nowEpochSeconds: () => 2_000_000_000,
    replayStore,
    tokenVerifier: {
      verify: async () => ({
        approvedSha: APPROVED_SHA,
        expiresAtEpochSeconds: 2_000_000_060,
        jti: GATEWAY_JTI,
        scope
      })
    }
  };
}
