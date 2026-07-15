import { describe, expect, it } from "vitest";
import { enforceGithubOidcPolicy } from "../src/release-gate/oidc-policy";
import { SecurityBoundaryError } from "../src/shared/errors";
import { APPROVED_SHA, NOW_EPOCH_SECONDS, validGithubPayload } from "./fixtures";

describe("GitHub OIDC 승인 정책", () => {
  it("고정 저장소·actor·main·workflow·SHA 조건을 모두 만족하면 승인한다", () => {
    const claims = enforceGithubOidcPolicy(
      validGithubPayload(),
      APPROVED_SHA,
      NOW_EPOCH_SECONDS
    );

    expect(claims).toMatchObject({
      approvedSha: APPROVED_SHA,
      jti: "github-oidc-jti-fixture",
      repository: "gdh0730/hub",
      workflowRef:
        "gdh0730/hub/.github/workflows/naver-live-check.yml@refs/heads/main"
    });
  });

  it.each([
    ["repository", "attacker/hub"],
    ["repository_id", "1"],
    ["repository_owner", "attacker"],
    ["repository_owner_id", "1"],
    ["actor", "attacker"],
    ["actor_id", "1"],
    ["event_name", "push"],
    ["ref", "refs/heads/feature"],
    ["ref_type", "tag"],
    ["repository_visibility", "public"],
    ["runner_environment", "self-hosted"],
    ["workflow_ref", "gdh0730/hub/.github/workflows/evil.yml@refs/heads/main"],
    ["sha", "b".repeat(40)],
    ["workflow_sha", "b".repeat(40)]
  ])("%s claim이 다르면 거부한다", (name, value) => {
    expect(() =>
      enforceGithubOidcPolicy(
        validGithubPayload({ [name]: value }),
        APPROVED_SHA,
        NOW_EPOCH_SECONDS
      )
    ).toThrowError(SecurityBoundaryError);
  });

  it.each([
    validGithubPayload({ exp: NOW_EPOCH_SECONDS }),
    validGithubPayload({ exp: NOW_EPOCH_SECONDS + 700 }),
    validGithubPayload({ iat: NOW_EPOCH_SECONDS + 6 }),
    validGithubPayload({ jti: "" })
  ])("유효 시간 또는 jti가 안전하지 않으면 거부한다", (payload) => {
    expect(() =>
      enforceGithubOidcPolicy(payload, APPROVED_SHA, NOW_EPOCH_SECONDS)
    ).toThrowError(SecurityBoundaryError);
  });
});
