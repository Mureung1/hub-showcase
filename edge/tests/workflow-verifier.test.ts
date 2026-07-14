import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GithubWorkflowContentVerifier
} from "../src/release-gate/workflow-verifier";
import type { ApprovedGithubClaims } from "../src/release-gate/oidc-policy";
import { APPROVED_SHA } from "./fixtures";

const TOKEN = "github_pat_fixture_read_only_1234567890";
const WORKFLOW = "name: Naver live check\non: workflow_dispatch\n";

describe("GitHub workflow 원문 hash 검증", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("고정 Contents API 경로와 승인 SHA만 조회해 SHA-256을 비교한다", async () => {
    const expectedHash = await sha256(WORKFLOW);
    let capturedUrl: URL | undefined;
    let capturedInit: RequestInit | undefined;
    const verifier = new GithubWorkflowContentVerifier(
      TOKEN,
      expectedHash,
      async (input, init) => {
        capturedUrl = new URL(String(input));
        capturedInit = init;
        return githubContentResponse(WORKFLOW);
      }
    );

    await expect(verifier.verify(approvedClaims())).resolves.toBe(true);
    expect(capturedUrl?.origin).toBe("https://api.github.com");
    expect(capturedUrl?.pathname).toBe(
      "/repos/gdh0730/hub/contents/.github/workflows/naver-live-check.yml"
    );
    expect(capturedUrl?.searchParams.get("ref")).toBe(APPROVED_SHA);
    expect(capturedInit?.method).toBe("GET");
    expect(capturedInit?.redirect).toBe("error");
    const headers = new Headers(capturedInit?.headers);
    expect(headers.get("authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("user-agent")).toBe("placepick-release-gate");
  });

  it("claim 안의 저장소 문자열을 URL로 사용하지 않는다", async () => {
    const expectedHash = await sha256(WORKFLOW);
    let capturedUrl = "";
    const verifier = new GithubWorkflowContentVerifier(
      TOKEN,
      expectedHash,
      async (input) => {
        capturedUrl = String(input);
        return githubContentResponse(WORKFLOW);
      }
    );

    await verifier.verify({ ...approvedClaims(), repository: "attacker/evil" });
    expect(capturedUrl).toContain("/repos/gdh0730/hub/");
    expect(capturedUrl).not.toContain("attacker");
  });

  it("token이나 고정 hash가 없으면 GitHub를 호출하지 않고 거부한다", async () => {
    const fetchSpy = vi.fn(async () => githubContentResponse(WORKFLOW));
    const missingToken = new GithubWorkflowContentVerifier(undefined, "a".repeat(64), fetchSpy);
    const missingHash = new GithubWorkflowContentVerifier(TOKEN, undefined, fetchSpy);

    await expect(missingToken.verify(approvedClaims())).resolves.toBe(false);
    await expect(missingHash.verify(approvedClaims())).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("잘못된 hash와 과대 응답을 거부한다", async () => {
    const wrongHash = new GithubWorkflowContentVerifier(
      TOKEN,
      "b".repeat(64),
      async () => githubContentResponse(WORKFLOW)
    );
    const oversized = new GithubWorkflowContentVerifier(
      TOKEN,
      await sha256(WORKFLOW),
      async () =>
        new Response("{}", {
          headers: {
            "content-length": String(512 * 1024 + 1),
            "content-type": "application/json"
          }
        })
    );

    await expect(wrongHash.verify(approvedClaims())).resolves.toBe(false);
    await expect(oversized.verify(approvedClaims())).resolves.toBe(false);
  });

  it("응답 body가 끝나지 않으면 5초 안에 중단하고 거부한다", async () => {
    vi.useFakeTimers();
    const verifier = new GithubWorkflowContentVerifier(
      TOKEN,
      await sha256(WORKFLOW),
      async () =>
        new Response(new ReadableStream<Uint8Array>(), {
          headers: { "content-type": "application/json" }
        })
    );

    const result = verifier.verify(approvedClaims());
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(result).resolves.toBe(false);
  });

  it("GitHub 오류에 token 문자열이 포함돼도 밖으로 노출하지 않는다", async () => {
    const verifier = new GithubWorkflowContentVerifier(
      TOKEN,
      await sha256(WORKFLOW),
      async () => {
        throw new Error(`provider failure: ${TOKEN}`);
      }
    );

    await expect(verifier.verify(approvedClaims())).resolves.toBe(false);
  });
});

function approvedClaims(): ApprovedGithubClaims {
  return {
    approvedSha: APPROVED_SHA,
    expiresAtEpochSeconds: 2_000_000_300,
    jti: "workflow-fixture-jti",
    repository: "gdh0730/hub",
    workflowRef: "gdh0730/hub/.github/workflows/naver-live-check.yml@refs/heads/main"
  };
}

function githubContentResponse(workflow: string): Response {
  return new Response(
    JSON.stringify({
      content: btoa(workflow),
      encoding: "base64"
    }),
    { headers: { "content-type": "application/json; charset=utf-8" } }
  );
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
