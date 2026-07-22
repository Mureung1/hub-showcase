import { ERROR_CODES } from "@decision-log/shared";

import { ProviderCallError } from "../ports.js";

/** Provider 호출당 타임아웃 (SPEC-AI-001 3-①: 45초 고정). */
export const PROVIDER_TIMEOUT_MS = 45_000;

/**
 * 호출을 타임아웃으로 감싼다. 초과 시 PROVIDER_TIMEOUT(재시도 대상).
 * SDK마다 취소 지원이 달라 AbortSignal을 넘길 수 있는 경우엔 함께 넘기되,
 * 여기서 경과 시간을 기준으로 확실히 끊는다.
 */
export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = PROVIDER_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  let timer: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ProviderCallError(
          ERROR_CODES.PROVIDER_TIMEOUT,
          true,
          `Provider가 ${timeoutMs}ms 안에 응답하지 않았습니다.`,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
