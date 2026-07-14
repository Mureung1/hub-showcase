import { SecurityBoundaryError } from "../shared/errors";
import { JoseGatewayTokenIssuer, type GatewayTokenIssuer } from "../shared/gateway-token";
import { jsonResponse, problemResponse, readJsonObject, requireBearerToken } from "../shared/http";
import { DurableObjectReplayStore, type ReplayStore } from "../shared/replay";
import { ReplayDurableObject } from "../shared/replay-durable-object";
import { SHA_PATTERN } from "../shared/constants";
import { JoseGithubOidcVerifier, type GithubOidcVerifier } from "./github-oidc";
import { enforceGithubOidcPolicy } from "./oidc-policy";
import {
  FetchProviderGatewayClient,
  type GatewayFetch,
  type ProviderGatewayClient
} from "./provider-gateway-client";
import {
  GithubWorkflowContentVerifier,
  type WorkflowFetch,
  type WorkflowContentVerifier
} from "./workflow-verifier";

export { ReplayDurableObject };

export interface ReleaseGateEnv {
  GITHUB_CONTENTS_READ_TOKEN?: string;
  NAVER_LIVE_WORKFLOW_SHA256?: string;
  PROVIDER_GATEWAY_ORIGIN?: string;
  RELEASE_GATE_SIGNING_KEY_ID?: string;
  RELEASE_GATE_SIGNING_PRIVATE_JWK?: string;
  REPLAY_STORE: DurableObjectNamespace;
}

export interface ReleaseGateDependencies {
  gatewayClient?: ProviderGatewayClient;
  gatewayFetch?: GatewayFetch;
  nowEpochSeconds?: () => number;
  oidcVerifier?: GithubOidcVerifier;
  replayStore?: ReplayStore;
  tokenIssuer?: GatewayTokenIssuer;
  workflowFetch?: WorkflowFetch;
  workflowVerifier?: WorkflowContentVerifier;
}

export async function handleReleaseGateRequest(
  request: Request,
  env: ReleaseGateEnv,
  dependencies: ReleaseGateDependencies = {}
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (request.method !== "POST" || url.pathname !== "/v1/live-checks/naver" || url.search !== "") {
      throw new SecurityBoundaryError(404, "RELEASE_GATE_ROUTE_NOT_FOUND", "경로를 찾을 수 없습니다.");
    }

    const nowEpochSeconds = dependencies.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1000));
    const oidcVerifier = dependencies.oidcVerifier ?? new JoseGithubOidcVerifier();
    const payload = await oidcVerifier.verify(requireBearerToken(request));

    const body = await readJsonObject(request);
    if (
      Object.keys(body).length !== 1 ||
      typeof body.approvedSha !== "string" ||
      !SHA_PATTERN.test(body.approvedSha)
    ) {
      throw new SecurityBoundaryError(
        400,
        "INVALID_LIVE_CHECK_REQUEST",
        "Live check 요청이 올바르지 않습니다."
      );
    }

    const claims = enforceGithubOidcPolicy(payload, body.approvedSha, nowEpochSeconds());

    const replayStore =
      dependencies.replayStore ??
      new DurableObjectReplayStore(env.REPLAY_STORE, "github-oidc-token-v1");
    if (!(await replayStore.consume(claims.jti, claims.expiresAtEpochSeconds))) {
      throw new SecurityBoundaryError(
        409,
        "GITHUB_OIDC_REPLAYED",
        "이미 사용했거나 만료된 GitHub OIDC token입니다."
      );
    }

    const workflowVerifier =
      dependencies.workflowVerifier ??
      new GithubWorkflowContentVerifier(
        env.GITHUB_CONTENTS_READ_TOKEN,
        env.NAVER_LIVE_WORKFLOW_SHA256,
        dependencies.workflowFetch
      );
    if (!(await workflowVerifier.verify(claims))) {
      throw new SecurityBoundaryError(
        403,
        "WORKFLOW_CONTENT_UNVERIFIED",
        "승인 workflow 내용을 검증하지 못했습니다."
      );
    }

    const tokenIssuer =
      dependencies.tokenIssuer ??
      (await JoseGatewayTokenIssuer.fromPrivateJwk(
        env.RELEASE_GATE_SIGNING_PRIVATE_JWK,
        env.RELEASE_GATE_SIGNING_KEY_ID
      ));
    const gatewayToken = await tokenIssuer.issue(claims.approvedSha, nowEpochSeconds());
    const gatewayClient =
      dependencies.gatewayClient ??
      new FetchProviderGatewayClient(env.PROVIDER_GATEWAY_ORIGIN, dependencies.gatewayFetch);
    const summary = await gatewayClient.run(gatewayToken, claims.approvedSha);
    return jsonResponse(summary, summary.status === "passed" ? 200 : 502);
  } catch (error) {
    return problemResponse(error);
  }
}

export default {
  fetch(request: Request, env: ReleaseGateEnv): Promise<Response> {
    return handleReleaseGateRequest(request, env);
  }
} satisfies ExportedHandler<ReleaseGateEnv>;
