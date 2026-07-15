import {
  EXPECTED_REPOSITORY,
  EXPECTED_WORKFLOW_PATH,
  GITHUB_CONTENTS_RESPONSE_MAX_BYTES,
  GITHUB_CONTENTS_TIMEOUT_MILLISECONDS,
  GITHUB_WORKFLOW_MAX_BYTES,
  SHA256_PATTERN
} from "../shared/constants";
import { isPlainObject, readBoundedResponseBytes } from "../shared/http";
import type { ApprovedGithubClaims } from "./oidc-policy";

const GITHUB_API_ORIGIN = "https://api.github.com";
const CONTENT_TOKEN_PATTERN = /^[A-Za-z0-9_\-.]+$/u;

export type WorkflowFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export interface WorkflowContentVerifier {
  verify(claims: ApprovedGithubClaims): Promise<boolean>;
}

/** 테스트나 명시적인 비활성화 경계에서 모든 live 실행을 fail closed 한다. */
export class DenyAllWorkflowContentVerifier implements WorkflowContentVerifier {
  async verify(_claims: ApprovedGithubClaims): Promise<boolean> {
    return false;
  }
}

export class FixtureWorkflowContentVerifier implements WorkflowContentVerifier {
  readonly #acceptedSha: string;

  constructor(acceptedSha: string) {
    this.#acceptedSha = acceptedSha;
  }

  async verify(claims: ApprovedGithubClaims): Promise<boolean> {
    return claims.approvedSha === this.#acceptedSha;
  }
}

/**
 * 승인 SHA의 고정 workflow 파일만 조회해 배포자가 고정한 원문 SHA-256과 비교한다.
 * token/hash가 비어 있거나 GitHub 응답을 완전히 검증할 수 없으면 외부 호출을 허용하지 않는다.
 */
export class GithubWorkflowContentVerifier implements WorkflowContentVerifier {
  readonly #expectedSha256: string | null;
  readonly #fetch: WorkflowFetch;
  readonly #token: string | null;

  constructor(
    token: string | undefined,
    expectedSha256: string | undefined,
    fetchImplementation: WorkflowFetch = fetch
  ) {
    this.#token = validToken(token) ? token : null;
    this.#expectedSha256 = validSha256(expectedSha256) ? expectedSha256 : null;
    this.#fetch = fetchImplementation;
  }

  async verify(claims: ApprovedGithubClaims): Promise<boolean> {
    if (this.#token === null || this.#expectedSha256 === null) {
      return false;
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GITHUB_CONTENTS_TIMEOUT_MILLISECONDS
    );
    try {
      const response = await this.#fetch(buildContentsUrl(claims.approvedSha), {
        method: "GET",
        headers: {
          accept: "application/vnd.github+json",
          authorization: `Bearer ${this.#token}`,
          "user-agent": "placepick-release-gate",
          "x-github-api-version": "2022-11-28"
        },
        redirect: "error",
        signal: controller.signal
      });
      if (
        !response.ok ||
        !response.headers.get("content-type")?.toLowerCase().startsWith("application/json")
      ) {
        await response.body?.cancel();
        return false;
      }

      const bytes = await readBoundedResponseBytes(
        response,
        GITHUB_CONTENTS_RESPONSE_MAX_BYTES,
        controller.signal
      );
      const decoded = decodeWorkflowContents(bytes);
      if (decoded === null || decoded.byteLength > GITHUB_WORKFLOW_MAX_BYTES) {
        return false;
      }
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", decoded));
      return constantTimeEqual(toHex(digest), this.#expectedSha256);
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildContentsUrl(approvedSha: string): URL {
  const url = new URL(
    `/repos/${EXPECTED_REPOSITORY}/contents/${EXPECTED_WORKFLOW_PATH}`,
    GITHUB_API_ORIGIN
  );
  url.searchParams.set("ref", approvedSha);
  return url;
}

function decodeWorkflowContents(bytes: Uint8Array): Uint8Array | null {
  let value: unknown;
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)
    );
  } catch {
    return null;
  }
  if (
    !isPlainObject(value) ||
    value.encoding !== "base64" ||
    typeof value.content !== "string"
  ) {
    return null;
  }

  const compact = value.content.replace(/\s/gu, "");
  if (compact.length === 0 || compact.length > Math.ceil(GITHUB_WORKFLOW_MAX_BYTES / 3) * 4 + 4) {
    return null;
  }
  try {
    const binary = atob(compact);
    const result = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      result[index] = binary.charCodeAt(index);
    }
    return result;
  } catch {
    return null;
  }
}

function validToken(value: string | undefined): value is string {
  return (
    typeof value === "string" &&
    value.length >= 20 &&
    value.length <= 1024 &&
    CONTENT_TOKEN_PATTERN.test(value)
  );
}

function validSha256(value: string | undefined): value is string {
  return typeof value === "string" && SHA256_PATTERN.test(value);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(actual: string, expected: string): boolean {
  let difference = actual.length ^ expected.length;
  const length = Math.max(actual.length, expected.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (actual.charCodeAt(index) || 0) ^ (expected.charCodeAt(index) || 0);
  }
  return difference === 0;
}
