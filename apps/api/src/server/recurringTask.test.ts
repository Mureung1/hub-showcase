import { afterEach, describe, expect, it, vi } from "vitest";
import { createRecurringTask } from "./recurringTask.js";

afterEach(() => {
  vi.useRealTimers();
});

describe("createRecurringTask", () => {
  it("시작 직후 실행하고 설정한 간격마다 반복한다", async () => {
    vi.useFakeTimers();
    const task = vi.fn(async () => undefined);
    const recurringTask = createRecurringTask({ intervalMs: 60_000, task });

    recurringTask.start();
    await vi.advanceTimersByTimeAsync(120_000);

    expect(task).toHaveBeenCalledTimes(3);
    await recurringTask.stop();
  });

  it("이전 실행이 끝나기 전에는 같은 프로세스에서 겹쳐 실행하지 않는다", async () => {
    vi.useFakeTimers();
    let finish: (() => void) | undefined;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const recurringTask = createRecurringTask({ intervalMs: 60_000, task });

    recurringTask.start();
    await vi.advanceTimersByTimeAsync(180_000);
    expect(task).toHaveBeenCalledTimes(1);

    finish?.();
    await recurringTask.stop();
  });
});
