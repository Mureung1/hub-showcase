/**
 * 비동기 작업을 지정된 타임아웃 시간 내에 수행하고, 실패하거나 타임아웃 발생 시 지정된 횟수만큼 재시도하는 유틸리티 함수입니다.
 * (현재는 TDD Red 단계를 진행하기 위해 fn()을 바로 호출하고 반환하는 스텁(Stub) 상태입니다.)
 */
export async function runWithTimeoutAndRetry<T>(
  fn: () => Promise<T>,
  options: { timeoutMs: number; maxRetries: number }
): Promise<T> {
  const { timeoutMs, maxRetries } = options;
  let attempts = 0;

  while (true) {
    attempts++;
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      // 1. 타임아웃용 프로미스 생성
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Timeout'));
        }, timeoutMs);
      });

      // 2. 실제 작업과 타임아웃을 경쟁(race)시킴
      const result = await Promise.race([
        fn(),
        timeoutPromise
      ]);

      return result;
    } catch (error) {
      // 최대 재시도 횟수 이하인 경우 재시도 진행
      if (attempts <= maxRetries) {
        continue;
      }
      // 초과한 경우 에러 던짐
      throw error;
    } finally {
      // 타이머 리소스 누수 방지를 위한 정리
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}
