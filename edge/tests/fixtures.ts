import type { JWTPayload } from "jose";
import {
  EXPECTED_ACTOR,
  EXPECTED_ACTOR_ID,
  EXPECTED_REF,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REPOSITORY_OWNER,
  EXPECTED_REPOSITORY_OWNER_ID,
  EXPECTED_WORKFLOW_REF
} from "../src/shared/constants";
import type {
  NaverCanarySummary,
  NaverEndpoint
} from "../src/provider-gateway/canary-contract";

export const APPROVED_SHA = "a".repeat(40);
export const NOW_EPOCH_SECONDS = 2_000_000_000;
export const GITHUB_JTI = "github-oidc-jti-fixture";
export const GATEWAY_JTI = "123e4567-e89b-42d3-a456-426614174000";

export function validGithubPayload(overrides: JWTPayload = {}): JWTPayload {
  return {
    actor: EXPECTED_ACTOR,
    actor_id: EXPECTED_ACTOR_ID,
    event_name: "workflow_dispatch",
    exp: NOW_EPOCH_SECONDS + 300,
    iat: NOW_EPOCH_SECONDS - 5,
    jti: GITHUB_JTI,
    ref: EXPECTED_REF,
    ref_type: "branch",
    repository: EXPECTED_REPOSITORY,
    repository_id: EXPECTED_REPOSITORY_ID,
    repository_owner: EXPECTED_REPOSITORY_OWNER,
    repository_owner_id: EXPECTED_REPOSITORY_OWNER_ID,
    repository_visibility: "private",
    runner_environment: "github-hosted",
    sha: APPROVED_SHA,
    workflow_ref: EXPECTED_WORKFLOW_REF,
    workflow_sha: APPROVED_SHA,
    ...overrides
  };
}

export function naverPayload(endpoint: NaverEndpoint, display = 1): Record<string, unknown> {
  return {
    lastBuildDate: "Tue, 14 Jul 2026 12:00:00 +0900",
    total: 1,
    start: 1,
    display: 1,
    items:
      endpoint === "local"
        ? [
            {
              title: "<b>검증 장소</b>",
              link: "https://example.invalid/place",
              category: "카페",
              description: "",
              address: "서울",
              roadAddress: "서울 테스트로 1",
              mapx: "1270000000",
              mapy: "370000000"
            }
          ].slice(0, display)
        : [
            {
              title: "<b>검증 글</b>",
              link: "https://example.invalid/blog",
              description: "검증 설명",
              bloggername: "검증 작성자",
              bloggerlink: "https://example.invalid",
              postdate: "20260714"
            }
          ].slice(0, display)
  };
}

export function passedCanarySummary(): NaverCanarySummary {
  return {
    approvedSha: APPROVED_SHA,
    callCount: 2,
    checks: [
      {
        endpoint: "local",
        durationMs: 10,
        errorCode: null,
        httpStatus: 200,
        itemCount: 1,
        jsonContentType: true,
        schemaValid: true,
        success: true
      },
      {
        endpoint: "blog",
        durationMs: 12,
        errorCode: null,
        httpStatus: 200,
        itemCount: 1,
        jsonContentType: true,
        schemaValid: true,
        success: true
      }
    ],
    status: "passed"
  };
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}
