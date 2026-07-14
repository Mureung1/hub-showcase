import {
  NAVER_API_HUB_ORIGIN,
  NAVER_BLOG_PATH,
  NAVER_LOCAL_PATH,
  PROVIDER_MIN_INTERVAL_MILLISECONDS,
  PROVIDER_RESPONSE_MAX_BYTES,
  PROVIDER_TIMEOUT_MILLISECONDS
} from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";
import { readBoundedResponseBytes } from "../shared/http";
import type {
  NaverCanaryCheck,
  NaverCanaryRequest,
  NaverCanarySummary,
  NaverEndpoint
} from "./canary-contract";
import { validateNaverResponse } from "./naver-schema";

export interface NaverCredentials {
  key: string;
  keyId: string;
}

export interface NaverProxyResult {
  check: NaverCanaryCheck;
  payload: unknown | null;
}

export type EdgeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
export type EdgeSleep = (milliseconds: number) => Promise<void>;

export class NaverCanaryClient {
  readonly #credentials: NaverCredentials;
  readonly #fetch: EdgeFetch;
  readonly #nowMilliseconds: () => number;
  readonly #sleep: EdgeSleep;

  constructor(
    credentials: NaverCredentials,
    fetchImplementation: EdgeFetch = fetch,
    nowMilliseconds: () => number = () => Date.now(),
    sleep: EdgeSleep = (milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds))
  ) {
    validateCredentials(credentials);
    this.#credentials = credentials;
    this.#fetch = fetchImplementation;
    this.#nowMilliseconds = nowMilliseconds;
    this.#sleep = sleep;
  }

  async run(request: NaverCanaryRequest): Promise<NaverCanarySummary> {
    const local = (await this.#perform("local", request)).check;
    await this.#sleep(PROVIDER_MIN_INTERVAL_MILLISECONDS);
    const blog = (await this.#perform("blog", request)).check;
    const status = local.success && blog.success ? "passed" : "failed";
    return {
      approvedSha: request.approvedSha,
      callCount: 2,
      checks: [local, blog],
      status
    };
  }

  search(endpoint: NaverEndpoint, request: NaverCanaryRequest): Promise<NaverProxyResult> {
    return this.#perform(endpoint, request);
  }

  async #perform(endpoint: NaverEndpoint, request: NaverCanaryRequest): Promise<NaverProxyResult> {
    const startedAt = this.#nowMilliseconds();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MILLISECONDS);
    let response: Response | undefined;

    try {
      response = await this.#fetch(buildUrl(endpoint, request), {
        method: "GET",
        headers: buildNaverHeaders(this.#credentials),
        redirect: "error",
        signal: controller.signal
      });

      const jsonContentType = isJsonContentType(response.headers.get("content-type"));
      const bytes = await readBoundedResponseBytes(
        response,
        PROVIDER_RESPONSE_MAX_BYTES,
        controller.signal
      );
      const durationMs = elapsed(startedAt, this.#nowMilliseconds());

      if (!response.ok) {
        return {
          check: {
            ...failedCheck(endpoint, durationMs, "PROVIDER_HTTP_ERROR"),
            httpStatus: response.status,
            jsonContentType
          },
          payload: null
        };
      }
      if (!jsonContentType) {
        return {
          check: {
            ...failedCheck(endpoint, durationMs, "PROVIDER_CONTENT_TYPE_REJECTED"),
            httpStatus: response.status
          },
          payload: null
        };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(
          new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)
        );
      } catch {
        return {
          check: {
            ...failedCheck(endpoint, durationMs, "PROVIDER_JSON_REJECTED"),
            httpStatus: response.status,
            jsonContentType: true
          },
          payload: null
        };
      }

      const schema = validateNaverResponse(endpoint, parsed, request.display);
      return {
        check: {
          endpoint,
          durationMs,
          errorCode: schema.valid ? null : "PROVIDER_SCHEMA_REJECTED",
          httpStatus: response.status,
          itemCount: schema.itemCount,
          jsonContentType: true,
          schemaValid: schema.valid,
          success: schema.valid
        },
        payload: schema.valid ? parsed : null
      };
    } catch (error) {
      const durationMs = elapsed(startedAt, this.#nowMilliseconds());
      return {
        check: {
          ...failedCheck(
            endpoint,
            durationMs,
            controller.signal.aborted ? "PROVIDER_TIMEOUT" : errorCode(error)
          ),
          httpStatus: response?.status ?? null,
          jsonContentType: isJsonContentType(response?.headers.get("content-type") ?? null)
        },
        payload: null
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildUrl(endpoint: NaverEndpoint, request: NaverCanaryRequest): URL {
  const path = endpoint === "local" ? NAVER_LOCAL_PATH : NAVER_BLOG_PATH;
  const url = new URL(path, NAVER_API_HUB_ORIGIN);
  url.searchParams.set("query", request.query);
  url.searchParams.set("display", String(request.display));
  return url;
}

function buildNaverHeaders(credentials: NaverCredentials): Headers {
  const headers = new Headers();
  headers.set("accept", "application/json");
  headers.set("x-ncp-apigw-api-key-id", credentials.keyId);
  headers.set("x-ncp-apigw-api-key", credentials.key);
  return headers;
}

function validateCredentials(credentials: NaverCredentials): void {
  if (!isSafeCredential(credentials.keyId) || !isSafeCredential(credentials.key)) {
    throw new SecurityBoundaryError(
      503,
      "NAVER_CREDENTIAL_UNAVAILABLE",
      "Naver API HUB 자격증명이 준비되지 않았습니다."
    );
  }
}

function isSafeCredential(value: string): boolean {
  return value.length >= 8 && value.length <= 1024 && !/[\s\u0000-\u001f\u007f]/u.test(value);
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.toLowerCase().split(";", 1)[0]?.trim() === "application/json";
}

function failedCheck(endpoint: NaverEndpoint, durationMs: number, code: string): NaverCanaryCheck {
  return {
    endpoint,
    durationMs,
    errorCode: code,
    httpStatus: null,
    itemCount: null,
    jsonContentType: false,
    schemaValid: false,
    success: false
  };
}

function elapsed(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round(endedAt - startedAt));
}

function errorCode(error: unknown): string {
  return error instanceof SecurityBoundaryError
    ? error.code
    : "PROVIDER_NETWORK_ERROR";
}
