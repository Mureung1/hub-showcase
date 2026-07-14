import { JSON_REQUEST_MAX_BYTES } from "./constants";
import { SecurityBoundaryError, asSecurityBoundaryError } from "./errors";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const PROBLEM_CONTENT_TYPE = "application/problem+json; charset=utf-8";

export async function readJsonObject(
  request: Request,
  maxBytes = JSON_REQUEST_MAX_BYTES
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new SecurityBoundaryError(
      415,
      "UNSUPPORTED_CONTENT_TYPE",
      "application/json 요청만 허용됩니다."
    );
  }

  const bytes = await readBoundedStream(request.body, maxBytes, "REQUEST_BODY_TOO_LARGE");
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes)
    );
  } catch {
    throw new SecurityBoundaryError(400, "INVALID_JSON", "JSON 요청 형식이 올바르지 않습니다.");
  }

  if (!isPlainObject(parsed)) {
    throw new SecurityBoundaryError(400, "INVALID_JSON_OBJECT", "JSON 객체가 필요합니다.");
  }
  return parsed;
}

export async function readBoundedResponseBytes(
  response: Response,
  maxBytes: number,
  signal?: AbortSignal
): Promise<Uint8Array> {
  const contentLength = response.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (Number.isFinite(parsedLength) && parsedLength > maxBytes) {
      await response.body?.cancel();
      throw new SecurityBoundaryError(
        502,
        "PROVIDER_RESPONSE_TOO_LARGE",
        "외부 공급자 응답 크기 제한을 초과했습니다."
      );
    }
  }
  return readBoundedStream(response.body, maxBytes, "PROVIDER_RESPONSE_TOO_LARGE", signal);
}

export function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": JSON_CONTENT_TYPE,
      "x-content-type-options": "nosniff"
    }
  });
}

export function problemResponse(error: unknown): Response {
  const safeError = asSecurityBoundaryError(error);
  return new Response(
    JSON.stringify({
      type: "about:blank",
      title: safeError.title,
      status: safeError.status,
      errorCode: safeError.code
    }),
    {
      status: safeError.status,
      headers: {
        "cache-control": "no-store",
        "content-type": PROBLEM_CONTENT_TYPE,
        "x-content-type-options": "nosniff"
      }
    }
  );
}

export function requireBearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/u);
  if (match?.[1] === undefined) {
    throw new SecurityBoundaryError(401, "BEARER_TOKEN_REQUIRED", "Bearer 인증이 필요합니다.");
  }
  return match[1];
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readBoundedStream(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  errorCode: string,
  signal?: AbortSignal
): Promise<Uint8Array> {
  if (body === null) {
    return new Uint8Array();
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let rejectAborted: ((reason?: unknown) => void) | undefined;
  const abortPromise =
    signal === undefined
      ? undefined
      : new Promise<never>((_resolve, reject) => {
          rejectAborted = reject;
        });
  const abort = (): void => {
    rejectAborted?.(new Error("response body read aborted"));
  };
  signal?.addEventListener("abort", abort, { once: true });

  try {
    if (signal?.aborted === true) {
      abort();
    }
    while (true) {
      const { done, value } =
        abortPromise === undefined
          ? await reader.read()
          : await Promise.race([reader.read(), abortPromise]);
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new SecurityBoundaryError(
          errorCode === "REQUEST_BODY_TOO_LARGE" ? 413 : 502,
          errorCode,
          errorCode === "REQUEST_BODY_TOO_LARGE"
            ? "요청 본문 크기 제한을 초과했습니다."
            : "외부 공급자 응답 크기 제한을 초과했습니다."
        );
      }
      chunks.push(value);
    }
  } finally {
    signal?.removeEventListener("abort", abort);
    if (signal?.aborted === true) {
      await reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }

  const result = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
