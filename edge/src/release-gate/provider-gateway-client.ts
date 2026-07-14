import {
  GATEWAY_RESPONSE_MAX_BYTES,
  NAVER_CANARY_DISPLAY,
  NAVER_CANARY_QUERY
} from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";
import { readBoundedResponseBytes } from "../shared/http";
import {
  parseRedactedCanarySummary,
  type NaverCanarySummary
} from "../provider-gateway/canary-contract";

// Gateway canary는 Local 5초 + 최소 간격 1초 + Blog 5초를 모두 수용해야 한다.
const GATEWAY_TIMEOUT_MILLISECONDS = 15_000;

export interface ProviderGatewayClient {
  run(token: string, approvedSha: string): Promise<NaverCanarySummary>;
}

export type GatewayFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class FetchProviderGatewayClient implements ProviderGatewayClient {
  readonly #fetch: GatewayFetch;
  readonly #origin: string;

  constructor(origin: string | undefined, fetchImplementation: GatewayFetch = fetch) {
    this.#origin = validateGatewayOrigin(origin);
    this.#fetch = fetchImplementation;
  }

  async run(token: string, approvedSha: string): Promise<NaverCanarySummary> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GATEWAY_TIMEOUT_MILLISECONDS);
    let response: Response;
    try {
      response = await this.#fetch(new URL("/v1/canaries/naver", this.#origin), {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          approvedSha,
          display: NAVER_CANARY_DISPLAY,
          query: NAVER_CANARY_QUERY
        }),
        redirect: "error",
        signal: controller.signal
      });
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.startsWith("application/json")) {
        throw new SecurityBoundaryError(
          502,
          "PROVIDER_GATEWAY_CONTENT_TYPE_REJECTED",
          "Provider Gateway 응답 형식이 올바르지 않습니다."
        );
      }

      const bytes = await readBoundedResponseBytes(
        response,
        GATEWAY_RESPONSE_MAX_BYTES,
        controller.signal
      );
      let parsed: unknown;
      try {
        parsed = JSON.parse(
          new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)
        );
      } catch {
        throw new SecurityBoundaryError(
          502,
          "PROVIDER_GATEWAY_JSON_REJECTED",
          "Provider Gateway 응답을 확인할 수 없습니다."
        );
      }

      if (!response.ok) {
        throw new SecurityBoundaryError(
          502,
          "PROVIDER_GATEWAY_REJECTED",
          "Provider Gateway가 live 검증을 거부했습니다."
        );
      }
      return parseRedactedCanarySummary(parsed, approvedSha);
    } catch (error) {
      if (error instanceof SecurityBoundaryError && !controller.signal.aborted) {
        throw error;
      }
      throw new SecurityBoundaryError(
        502,
        controller.signal.aborted ? "PROVIDER_GATEWAY_TIMEOUT" : "PROVIDER_GATEWAY_UNAVAILABLE",
        "Provider Gateway를 사용할 수 없습니다."
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

function validateGatewayOrigin(origin: string | undefined): string {
  let parsed: URL;
  try {
    parsed = new URL(origin ?? "");
  } catch {
    throw configurationError();
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.port !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw configurationError();
  }
  return parsed.origin;
}

function configurationError(): SecurityBoundaryError {
  return new SecurityBoundaryError(
    503,
    "PROVIDER_GATEWAY_ORIGIN_INVALID",
    "Provider Gateway 주소가 준비되지 않았습니다."
  );
}
