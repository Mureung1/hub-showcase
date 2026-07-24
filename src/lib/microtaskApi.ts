import { apiFetch } from "./api.js";

export const LV2_MICROTASK_CLIENT_TIMEOUT_MS = 2_500;

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

const inFlight = new Map<string, Promise<Lv2MicrotaskResult>>();

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
  const existing = inFlight.get(key);
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
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

export function resetLv2MicrotaskRequestsForTests(): void {
  inFlight.clear();
}
