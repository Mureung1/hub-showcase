import type { JWTPayload } from "jose";
import {
  EXPECTED_ACTOR,
  EXPECTED_ACTOR_ID,
  EXPECTED_REF,
  EXPECTED_REPOSITORY,
  EXPECTED_REPOSITORY_ID,
  EXPECTED_REPOSITORY_OWNER,
  EXPECTED_REPOSITORY_OWNER_ID,
  EXPECTED_WORKFLOW_REF,
  GITHUB_TOKEN_MAX_LIFETIME_SECONDS,
  SHA_PATTERN
} from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";

export interface ApprovedGithubClaims {
  approvedSha: string;
  expiresAtEpochSeconds: number;
  jti: string;
  repository: string;
  workflowRef: string;
}

export function enforceGithubOidcPolicy(
  payload: JWTPayload,
  approvedSha: string,
  nowEpochSeconds: number
): ApprovedGithubClaims {
  if (!SHA_PATTERN.test(approvedSha)) {
    throw rejected();
  }

  requireClaim(payload, "repository", EXPECTED_REPOSITORY);
  requireClaim(payload, "repository_id", EXPECTED_REPOSITORY_ID);
  requireClaim(payload, "repository_owner", EXPECTED_REPOSITORY_OWNER);
  requireClaim(payload, "repository_owner_id", EXPECTED_REPOSITORY_OWNER_ID);
  requireClaim(payload, "actor", EXPECTED_ACTOR);
  requireClaim(payload, "actor_id", EXPECTED_ACTOR_ID);
  requireClaim(payload, "event_name", "workflow_dispatch");
  requireClaim(payload, "ref", EXPECTED_REF);
  requireClaim(payload, "ref_type", "branch");
  requireClaim(payload, "repository_visibility", "private");
  requireClaim(payload, "runner_environment", "github-hosted");
  requireClaim(payload, "workflow_ref", EXPECTED_WORKFLOW_REF);
  requireClaim(payload, "sha", approvedSha);
  requireClaim(payload, "workflow_sha", approvedSha);

  if (
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    payload.iat > nowEpochSeconds + 5 ||
    payload.exp <= nowEpochSeconds ||
    payload.exp - payload.iat > GITHUB_TOKEN_MAX_LIFETIME_SECONDS
  ) {
    throw rejected();
  }
  if (typeof payload.jti !== "string" || payload.jti.length === 0 || payload.jti.length > 256) {
    throw rejected();
  }

  return {
    approvedSha,
    expiresAtEpochSeconds: payload.exp,
    jti: payload.jti,
    repository: EXPECTED_REPOSITORY,
    workflowRef: EXPECTED_WORKFLOW_REF
  };
}

function requireClaim(payload: JWTPayload, name: string, expected: string): void {
  if (payload[name] !== expected) {
    throw rejected();
  }
}

function rejected(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    403,
    "GITHUB_OIDC_POLICY_REJECTED",
    "승인된 GitHub 실행 조건과 일치하지 않습니다."
  );
}
