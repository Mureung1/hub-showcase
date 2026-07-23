import { describe, it, expect, vi } from 'vitest';
import { runWithTimeoutAndRetry } from './timeoutRetry';

describe('runWithTimeoutAndRetry', () => {
  // 지정 시간만큼 대기하는 헬퍼
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  it('성공 케이스: 작업을 바로 성공하면 그 결과를 반환해야 한다', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await runWithTimeoutAndRetry(fn, { timeoutMs: 1000, maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('타임아웃 케이스: 지정된 타임아웃을 초과하면 에러(Timeout)를 발생시켜야 한다', async () => {
    const fn = async () => {
      await delay(200); // 200ms 지연
      return 'done';
    };

    // 50ms 타임아웃을 주어 강제로 실패하게 함
    await expect(
      runWithTimeoutAndRetry(fn, { timeoutMs: 50, maxRetries: 0 })
    ).rejects.toThrow('Timeout');
  });

  it('재시도 성공 케이스: 처음 2번 실패 후 3번째 성공하면 최종 결과를 반환해야 한다', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      if (callCount < 3) {
        throw new Error('Temporary failure');
      }
      return 'success after retry';
    };

    const result = await runWithTimeoutAndRetry(fn, { timeoutMs: 500, maxRetries: 3 });
    expect(result).toBe('success after retry');
    expect(callCount).toBe(3); // 총 3번 호출
  });

  it('재시도 초과 실패 케이스: 최대 재시도 횟수를 넘게 모두 실패하면 마지막 에러를 던져야 한다', async () => {
    let callCount = 0;
    const fn = async () => {
      callCount++;
      throw new Error(`Failure number ${callCount}`);
    };

    // maxRetries: 2 이면 총 3번 시도 (최초 1번 + 재시도 2번)
    await expect(
      runWithTimeoutAndRetry(fn, { timeoutMs: 500, maxRetries: 2 })
    ).rejects.toThrow('Failure number 3');

    expect(callCount).toBe(3);
  });
});
