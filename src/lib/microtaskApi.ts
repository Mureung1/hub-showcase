import { apiFetch } from "./api.js";

export const LV2_MICROTASK_CLIENT_TIMEOUT_MS = 2_500;
export const LV3_MICROTASK_CLIENT_TIMEOUT_MS = 3_000;

export interface Lv2MicrotaskRequest {
  title: string;
  type: string;
  reason: "overwhelm" | "dislike" | "temptation" | "custom";
  customReason: string | null;
  level: 2;
}

interface Lv2MicrotaskResponse {
  data: {
    microTask: string;
    source: "gemini" | "rule_based";
  };
}

export interface Lv2MicrotaskResult {
  microTask: string;
  generationSource: "gemini" | "rule_based";
}

export interface Lv3MicrotaskRequest {
  taskId: string;
  reason: "overwhelm" | "dislike" | "temptation" | "custom";
  customReason: string | null;
  reasonChanged: boolean | null;
  lv2MicroTask: string | null;
  level: 3;
}

export interface Lv3MicrotaskResult {
  status: "generated";
  microTask: string;
  generationSource: "gemini";
  memoryEvidence: { sourceDoneEventId: string } | null;
}

const lv2InFlight = new Map<string, Promise<Lv2MicrotaskResult>>();
const lv3InFlight = new Map<string, Promise<Lv3MicrotaskResult>>();

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function createRequestKey(input: Lv2MicrotaskRequest): string {
  return JSON.stringify({
    title: normalizeWhitespace(input.title),
    type: input.type,
    reason: input.reason,
    customReason:
      input.customReason === null
        ? null
        : normalizeWhitespace(input.customReason),
    level: 2,
  });
}

export function requestLv2Microtask(
  input: Lv2MicrotaskRequest,
): Promise<Lv2MicrotaskResult> {
  const key = createRequestKey(input);
  const existing = lv2InFlight.get(key);
  if (existing) return existing;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    LV2_MICROTASK_CLIENT_TIMEOUT_MS,
  );

  const promise = apiFetch("/api/microtasks/lv2", {
    method: "POST",
    signal: controller.signal,
    body: JSON.stringify(input),
  })
    .then((response: Lv2MicrotaskResponse) => {
      const microTask = response?.data?.microTask;
      const source = response?.data?.source;
      if (typeof microTask !== "string" || microTask.trim().length === 0) {
        throw new Error("invalid_microtask_response");
      }
      if (source !== "gemini" && source !== "rule_based") {
        throw new Error("invalid_microtask_source");
      }
      return {
        microTask: microTask.trim(),
        generationSource: source,
      };
    })
    .finally(() => {
      clearTimeout(timeoutId);
      lv2InFlight.delete(key);
    });

  lv2InFlight.set(key, promise);
  return promise;
}

function createLv3RequestKey(input: Lv3MicrotaskRequest): string {
  return JSON.stringify({
    taskId: input.taskId.trim(),
    reason: input.reason,
    customReason:
      input.customReason === null
        ? null
        : normalizeWhitespace(input.customReason),
    reasonChanged: input.reasonChanged,
    lv2MicroTask:
      input.lv2MicroTask === null
        ? null
        : normalizeWhitespace(input.lv2MicroTask),
    level: 3,
  });
}

export function requestLv3Microtask(
  input: Lv3MicrotaskRequest,
): Promise<Lv3MicrotaskResult> {
  const key = createLv3RequestKey(input);
  const existing = lv3InFlight.get(key);
  if (existing) return existing;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    LV3_MICROTASK_CLIENT_TIMEOUT_MS,
  );

  const promise = apiFetch("/api/microtasks/lv3", {
    method: "POST",
    signal: controller.signal,
    body: JSON.stringify(input),
  })
    .then((response: { data?: Record<string, unknown> }) => {
      const data = response?.data;
      const microTask = data?.microTask;
      const source = data?.source;
      const evidence = data?.memoryEvidence;
      const sourceDoneEventId =
        evidence !== null &&
        evidence &&
        typeof evidence === "object" &&
        !Array.isArray(evidence) &&
        "sourceDoneEventId" in evidence
          ? evidence.sourceDoneEventId
          : null;

      if (
        data?.status !== "generated" ||
        typeof microTask !== "string" ||
        microTask.trim().length === 0 ||
        source !== "gemini" ||
        (evidence !== null &&
          (typeof sourceDoneEventId !== "string" ||
            sourceDoneEventId.trim().length === 0))
      ) {
        throw new Error("invalid_lv3_microtask_response");
      }

      return {
        status: "generated",
        microTask: microTask.trim(),
        generationSource: "gemini",
        // 서버가 발급한 추적 참조를 그대로 운반할 뿐 신뢰 판단은 하지 않는다.
        // 완료 API가 실제 done 이벤트를 다시 조회해 최종 스냅샷을 만든다.
        memoryEvidence:
          evidence === null
            ? null
            : {
                sourceDoneEventId: (sourceDoneEventId as string).trim(),
              },
      } as const;
    })
    .finally(() => {
      clearTimeout(timeoutId);
      lv3InFlight.delete(key);
    });

  lv3InFlight.set(key, promise);
  return promise;
}

export function resetLv2MicrotaskRequestsForTests(): void {
  lv2InFlight.clear();
}

export function resetLv3MicrotaskRequestsForTests(): void {
  lv3InFlight.clear();
}
