/** 재시도해도 의미가 없는 실패(클라이언트 에러 등)를 표시한다 — withRetry는 이 에러를 즉시 던진다 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableError'
  }
}

export interface RetryOptions {
  /** 총 시도 횟수(최초 시도 포함). 기본 3회 */
  maxAttempts?: number
  /** 첫 재시도 전 대기 시간(ms). 이후 시도마다 2배씩 증가(지수 백오프). 기본 1000ms */
  baseDelayMs?: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 일시적 네트워크 blip에 대응하는 지수 백오프 재시도 헬퍼(이슈 #74).
 * `NonRetryableError`가 던져지면 즉시 실패 처리(재시도 안 함) — 잘못된 인증키처럼 재시도해도
 * 절대 성공할 수 없는 실패를 계속 재시도해서 시간만 낭비하지 않기 위함.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 1000 } = options
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (err instanceof NonRetryableError || attempt === maxAttempts) {
        throw err
      }
      await sleep(baseDelayMs * 2 ** (attempt - 1))
    }
  }

  throw lastError
}
