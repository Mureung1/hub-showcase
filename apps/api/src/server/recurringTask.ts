export interface RecurringTask {
  start(): void;
  stop(): Promise<void>;
}

interface RecurringTaskOptions {
  intervalMs: number;
  task: () => Promise<void>;
  onError?: (error: unknown) => void;
}

export function createRecurringTask({
  intervalMs,
  task,
  onError = (error) => console.error("[background] 작업 실행 실패", error),
}: RecurringTaskOptions): RecurringTask {
  let timer: NodeJS.Timeout | null = null;
  let currentRun: Promise<void> | null = null;
  let stopped = false;

  const run = () => {
    if (stopped || currentRun) return;
    currentRun = task()
      .catch(onError)
      .finally(() => {
        currentRun = null;
      });
  };

  return {
    start() {
      if (timer || stopped) return;
      run();
      timer = setInterval(run, intervalMs);
      timer.unref();
    },
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      timer = null;
      await currentRun;
    },
  };
}
