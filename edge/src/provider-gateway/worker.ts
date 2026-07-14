import {
  enforceFixedCanary,
  parseNaverCanaryRequest,
  parseNaverSearchQuery
} from "./canary-contract";
import { NaverCanaryClient, type EdgeFetch, type EdgeSleep } from "./naver-client";
import { SecurityBoundaryError } from "../shared/errors";
import { JoseGatewayTokenVerifier, type GatewayTokenVerifier } from "../shared/gateway-token";
import { jsonResponse, problemResponse, readJsonObject, requireBearerToken } from "../shared/http";
import { DurableObjectReplayStore, type ReplayStore } from "../shared/replay";
import { ReplayDurableObject } from "../shared/replay-durable-object";
import {
  PROVIDER_GATEWAY_BLOG_SCOPE,
  PROVIDER_GATEWAY_LOCAL_SCOPE,
  PROVIDER_GATEWAY_SCOPE
} from "../shared/constants";

export { ReplayDurableObject };

export interface ProviderGatewayEnv {
  NAVER_API_HUB_KEY?: string;
  NAVER_API_HUB_KEY_ID?: string;
  RELEASE_GATE_SIGNING_KEY_ID?: string;
  RELEASE_GATE_SIGNING_PUBLIC_JWK?: string;
  REPLAY_STORE: DurableObjectNamespace;
}

export interface ProviderGatewayDependencies {
  fetchImplementation?: EdgeFetch;
  nowEpochSeconds?: () => number;
  nowMilliseconds?: () => number;
  replayStore?: ReplayStore;
  sleep?: EdgeSleep;
  tokenVerifier?: GatewayTokenVerifier;
}

export async function handleProviderGatewayRequest(
  request: Request,
  env: ProviderGatewayEnv,
  dependencies: ProviderGatewayDependencies = {}
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const route = resolveRoute(request, url);
    if (route === null) {
      throw new SecurityBoundaryError(404, "PROVIDER_GATEWAY_ROUTE_NOT_FOUND", "경로를 찾을 수 없습니다.");
    }

    const nowEpochSeconds = dependencies.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    const verifier =
      dependencies.tokenVerifier ??
      (await JoseGatewayTokenVerifier.fromPublicJwk(
        env.RELEASE_GATE_SIGNING_PUBLIC_JWK,
        env.RELEASE_GATE_SIGNING_KEY_ID
      ));
    const authorization = await verifier.verify(requireBearerToken(request), nowEpochSeconds());
    requireScope(authorization.scope, route);
    const naverRequest =
      route === "canary"
        ? parseNaverCanaryRequest(await readJsonObject(request))
        : parseNaverSearchQuery(url, authorization.approvedSha, route);
    if (authorization.approvedSha !== naverRequest.approvedSha) {
      throw new SecurityBoundaryError(403, "APPROVED_SHA_MISMATCH", "승인된 SHA가 일치하지 않습니다.");
    }
    if (route === "canary") {
      enforceFixedCanary(naverRequest);
    }

    const replayStore =
      dependencies.replayStore ??
      new DurableObjectReplayStore(env.REPLAY_STORE, "provider-gateway-token-v1");
    if (!(await replayStore.consume(authorization.jti, authorization.expiresAtEpochSeconds))) {
      throw new SecurityBoundaryError(
        409,
        "GATEWAY_TOKEN_REPLAYED",
        "이미 사용했거나 만료된 Gateway token입니다."
      );
    }

    const client = createNaverClient(env, dependencies);
    if (route === "canary") {
      const summary = await client.run(naverRequest);
      return jsonResponse(summary, summary.status === "passed" ? 200 : 502);
    }

    const result = await client.search(route, naverRequest);
    if (!result.check.success || result.payload === null) {
      throw new SecurityBoundaryError(
        502,
        "NAVER_PROXY_RESPONSE_REJECTED",
        "Naver API HUB 응답을 확인할 수 없습니다."
      );
    }
    return jsonResponse(result.payload);
  } catch (error) {
    return problemResponse(error);
  }
}

function createNaverClient(
  env: ProviderGatewayEnv,
  dependencies: ProviderGatewayDependencies
): NaverCanaryClient {
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const nowMilliseconds = dependencies.nowMilliseconds ?? (() => Date.now());
  return new NaverCanaryClient(
    {
      key: env.NAVER_API_HUB_KEY ?? "",
      keyId: env.NAVER_API_HUB_KEY_ID ?? ""
    },
    fetchImplementation,
    nowMilliseconds,
    dependencies.sleep
  );
}

type ProviderRoute = "blog" | "canary" | "local";

function resolveRoute(request: Request, url: URL): ProviderRoute | null {
  if (request.method === "POST" && url.pathname === "/v1/canaries/naver" && url.search === "") {
    return "canary";
  }
  if (request.method === "GET" && url.pathname === "/search/v1/local") {
    return "local";
  }
  if (request.method === "GET" && url.pathname === "/search/v1/blog") {
    return "blog";
  }
  return null;
}

function requireScope(scope: string, route: ProviderRoute): void {
  const expected =
    route === "canary"
      ? PROVIDER_GATEWAY_SCOPE
      : route === "local"
        ? PROVIDER_GATEWAY_LOCAL_SCOPE
        : PROVIDER_GATEWAY_BLOG_SCOPE;
  if (scope !== expected) {
    throw new SecurityBoundaryError(
      403,
      "GATEWAY_SCOPE_REJECTED",
      "Gateway token의 허용 범위와 요청 경로가 일치하지 않습니다."
    );
  }
}

export default {
  fetch(request: Request, env: ProviderGatewayEnv): Promise<Response> {
    return handleProviderGatewayRequest(request, env);
  }
} satisfies ExportedHandler<ProviderGatewayEnv>;
