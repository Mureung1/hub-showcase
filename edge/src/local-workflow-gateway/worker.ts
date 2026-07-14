import { parseNaverCanaryRequest } from "../provider-gateway/canary-contract";
import { NaverCanaryClient, type EdgeSleep } from "../provider-gateway/naver-client";
import { JSON_REQUEST_MAX_BYTES } from "../shared/constants";
import { SecurityBoundaryError } from "../shared/errors";
import { jsonResponse, problemResponse, requireBearerToken } from "../shared/http";
import {
  CONDITION_FIXTURE_HASH,
  REASON_FIXTURE_HASH,
  WORKFLOW_SPLIT_PATH,
  parseWorkflowSplitRequest,
  type WorkflowSplitRequest,
  type WorkflowSplitSummary,
  type WorkflowStageCheck
} from "./contract";
import { EliceProductProbeClient, type WorkflowFetch } from "./elice-probe-client";

const MINIMUM_CALL_INTERVAL_MILLISECONDS = 1_000;
const FIXED_NAVER_QUERY = "서울 카페";
const PROVIDER_CALL_BUDGET = 4;

export interface LocalWorkflowGatewayEnv {
  CHAT_PROXY_URL?: string;
  LOCAL_WORKFLOW_TOKEN?: string;
  NAVER_API_HUB_KEY?: string;
  NAVER_API_HUB_KEY_ID?: string;
  OPENAI_MODEL?: string;
  PLACEPICK_EXTERNAL_MODE?: string;
  PROXY_TOKEN?: string;
}

export interface LocalWorkflowGatewayDependencies {
  fetchImplementation?: WorkflowFetch;
  nowMilliseconds?: () => number;
  sleep?: EdgeSleep;
}

export async function handleLocalWorkflowGatewayRequest(
  request: Request,
  env: LocalWorkflowGatewayEnv,
  dependencies: LocalWorkflowGatewayDependencies = {}
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (
      request.method !== "POST" ||
      url.pathname !== WORKFLOW_SPLIT_PATH ||
      url.search !== ""
    ) {
      throw new SecurityBoundaryError(
        404,
        "LOCAL_WORKFLOW_ROUTE_NOT_FOUND",
        "허용된 Split Live 경로를 찾을 수 없습니다."
      );
    }
    requireLoopbackUrl(url);
    requireAllowedRequestHeaders(request);
    requireLiveContractMode(env.PLACEPICK_EXTERNAL_MODE);
    requireLocalToken(request, env.LOCAL_WORKFLOW_TOKEN);
    const probe = await readWorkflowSplitRequest(request);
    const configuredFetch = dependencies.fetchImplementation ?? fetch;
    let providerCallCount = 0;
    const fetchImplementation: WorkflowFetch = (input, init) => {
      providerCallCount += 1;
      if (providerCallCount > PROVIDER_CALL_BUDGET) {
        throw new SecurityBoundaryError(
          502,
          "WORKFLOW_PROVIDER_CALL_BUDGET_EXCEEDED",
          "Split Live provider 호출 상한을 초과했습니다."
        );
      }
      return configuredFetch(input, init);
    };
    const nowMilliseconds = dependencies.nowMilliseconds ?? (() => Date.now());
    const sleep = dependencies.sleep ?? ((milliseconds) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds)));

    const elice = new EliceProductProbeClient(
      {
        baseUrl: env.CHAT_PROXY_URL ?? "",
        model: env.OPENAI_MODEL ?? "",
        token: env.PROXY_TOKEN ?? ""
      },
      fetchImplementation,
      nowMilliseconds
    );
    const naver = new NaverCanaryClient(
      {
        key: env.NAVER_API_HUB_KEY ?? "",
        keyId: env.NAVER_API_HUB_KEY_ID ?? ""
      },
      fetchImplementation,
      nowMilliseconds,
      sleep
    );

    const condition = await elice.runConditionProbe();
    await sleep(MINIMUM_CALL_INTERVAL_MILLISECONDS);
    const local = naverCheck(
      "naverLocal",
      (await naver.search(
        "local",
        parseNaverCanaryRequest({
          approvedSha: probe.approvedSha,
          display: 5,
          query: FIXED_NAVER_QUERY
        })
      )).check
    );
    await sleep(MINIMUM_CALL_INTERVAL_MILLISECONDS);
    const blog = naverCheck(
      "naverBlog",
      (await naver.search(
        "blog",
        parseNaverCanaryRequest({
          approvedSha: probe.approvedSha,
          display: 3,
          query: FIXED_NAVER_QUERY
        })
      )).check
    );
    await sleep(MINIMUM_CALL_INTERVAL_MILLISECONDS);
    const reason = await elice.runReasonProbe();
    if (providerCallCount !== PROVIDER_CALL_BUDGET) {
      throw new SecurityBoundaryError(
        502,
        "WORKFLOW_PROVIDER_CALL_BUDGET_INCOMPLETE",
        "Split Live provider 호출 수가 계약과 다릅니다."
      );
    }

    // Provider body는 이 지점 이후 참조하지 않고 safe summary만 반환한다.
    const checks: WorkflowSplitSummary["checks"] = [condition, local, blog, reason];
    const passed = checks.every((check) => check.success);
    const summary: WorkflowSplitSummary = {
      approvedSha: probe.approvedSha,
      callCount: 4,
      checks,
      linked: false,
      mode: "split",
      status: passed ? "passed" : "failed"
    };
    return jsonResponse(summary, passed ? 200 : 502);
  } catch (error) {
    return problemResponse(error);
  }
}

async function readWorkflowSplitRequest(request: Request): Promise<WorkflowSplitRequest> {
  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    (!/^(0|[1-9][0-9]*)$/u.test(contentLength) || Number(contentLength) > JSON_REQUEST_MAX_BYTES)
  ) {
    throw new SecurityBoundaryError(
      413,
      "REQUEST_BODY_TOO_LARGE",
      "요청 본문 크기 제한을 초과했습니다."
    );
  }
  const body = await readBoundedRequestBody(request);
  let text: string;
  let value: unknown;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(body);
    value = JSON.parse(text);
  } catch {
    throw new SecurityBoundaryError(
      400,
      "INVALID_WORKFLOW_SPLIT_JSON",
      "Split Live JSON 요청 형식이 올바르지 않습니다."
    );
  }
  const parsed = parseWorkflowSplitRequest(value);
  const canonical = JSON.stringify({
    approvedSha: parsed.approvedSha,
    conditionFixtureHash: CONDITION_FIXTURE_HASH,
    reasonFixtureHash: REASON_FIXTURE_HASH
  });
  if (text !== canonical) {
    throw new SecurityBoundaryError(
      400,
      "NON_CANONICAL_WORKFLOW_SPLIT_REQUEST",
      "고정된 Split Live 요청 본문만 허용됩니다."
    );
  }
  return parsed;
}

async function readBoundedRequestBody(request: Request): Promise<Uint8Array> {
  if (request.body === null) {
    throw new SecurityBoundaryError(
      400,
      "INVALID_WORKFLOW_SPLIT_JSON",
      "Split Live JSON 요청 형식이 올바르지 않습니다."
    );
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      size += value.byteLength;
      if (size > JSON_REQUEST_MAX_BYTES) {
        await reader.cancel();
        throw new SecurityBoundaryError(
          413,
          "REQUEST_BODY_TOO_LARGE",
          "요청 본문 크기 제한을 초과했습니다."
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function requireLoopbackUrl(url: URL): void {
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.username !== "" ||
    url.password !== "" ||
    url.hash !== ""
  ) {
    throw new SecurityBoundaryError(
      404,
      "LOCAL_WORKFLOW_ROUTE_NOT_FOUND",
      "허용된 Split Live 경로를 찾을 수 없습니다."
    );
  }
}

function requireAllowedRequestHeaders(request: Request): void {
  for (const name of request.headers.keys()) {
    if (!ALLOWED_REQUEST_HEADERS.has(name.toLowerCase())) {
      throw new SecurityBoundaryError(
        400,
        "WORKFLOW_REQUEST_HEADER_REJECTED",
        "허용되지 않은 Split Live 요청 header입니다."
      );
    }
  }
  const accept = request.headers.get("accept")?.toLowerCase().trim();
  const contentType = request.headers.get("content-type")?.toLowerCase().replace(/\s/gu, "");
  if (
    accept !== "application/json" ||
    (contentType !== "application/json" && contentType !== "application/json;charset=utf-8") ||
    (request.headers.has("content-length") && request.headers.has("transfer-encoding"))
  ) {
    throw new SecurityBoundaryError(
      400,
      "WORKFLOW_REQUEST_HEADER_REJECTED",
      "허용되지 않은 Split Live 요청 header입니다."
    );
  }
}

function naverCheck(
  stage: "naverLocal" | "naverBlog",
  check: {
    durationMs: number;
    errorCode: string | null;
    httpStatus: number | null;
    itemCount: number | null;
    schemaValid: boolean;
    success: boolean;
  }
): WorkflowStageCheck {
  if (check.success && check.itemCount !== null) {
    return {
      durationMs: check.durationMs,
      errorCode: null,
      httpStatus: check.httpStatus,
      itemCount: check.itemCount,
      schemaValid: true,
      stage,
      success: true
    };
  }
  return {
    durationMs: check.durationMs,
    errorCode: check.errorCode ?? "PROVIDER_SCHEMA_REJECTED",
    httpStatus: check.httpStatus,
    schemaValid: false,
    stage,
    success: false
  };
}

function requireLiveContractMode(mode: string | undefined): void {
  if (mode !== "live-contract") {
    throw new SecurityBoundaryError(
      503,
      "LOCAL_WORKFLOW_MODE_REJECTED",
      "Split Live 전용 실행 모드가 아닙니다."
    );
  }
}

function requireLocalToken(request: Request, expected: string | undefined): void {
  if (!isSafeLocalToken(expected) || requireBearerToken(request) !== expected) {
    throw new SecurityBoundaryError(
      401,
      "LOCAL_WORKFLOW_TOKEN_REJECTED",
      "Split Live local token이 올바르지 않습니다."
    );
  }
}

function isSafeLocalToken(value: string | undefined): value is string {
  return value !== undefined && /^[A-Za-z0-9_-]{43,128}$/u.test(value);
}

const ALLOWED_REQUEST_HEADERS = new Set([
  "accept",
  "accept-encoding",
  "authorization",
  "cdn-loop",
  "cf-connecting-ip",
  "cf-ew-via",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "cf-worker",
  "connection",
  "content-length",
  "content-type",
  "host",
  "transfer-encoding",
  "user-agent",
  "x-forwarded-proto",
  "x-real-ip"
]);

export default {
  fetch(request: Request, env: LocalWorkflowGatewayEnv): Promise<Response> {
    return handleLocalWorkflowGatewayRequest(request, env);
  }
} satisfies ExportedHandler<LocalWorkflowGatewayEnv>;
