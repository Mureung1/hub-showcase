export type MemoryMeasurement = Readonly<{
  bytes: number | null;
  limitation: string;
  source:
    | 'measureUserAgentSpecificMemory'
    | 'performance.memory'
    | 'timed-out'
    | 'unavailable';
}>;

export type MemoryMeasurementOptions = Readonly<{
  heapBytes?: number;
  measureUserAgentSpecificMemory?: () => Promise<Readonly<{ bytes: number }>>;
  measureUserAgentSpecificMemoryReceiver?: object;
  timeoutMs: number;
}>;

export async function measureMemoryAtBoundary(
  options: MemoryMeasurementOptions
): Promise<MemoryMeasurement> {
  const measureUserAgentSpecificMemory = options.measureUserAgentSpecificMemory;
  if (measureUserAgentSpecificMemory !== undefined) {
    const measurement = await measureUserAgentMemory({
      measureUserAgentSpecificMemory,
      measureUserAgentSpecificMemoryReceiver:
        options.measureUserAgentSpecificMemoryReceiver,
      timeoutMs: options.timeoutMs,
    });
    if (measurement.bytes !== null || typeof options.heapBytes !== 'number') {
      return measurement;
    }

    return createHeapMeasurement(
      options.heapBytes,
      `${measurement.limitation} 대신 JS heap 추정값을 기록합니다.`
    );
  }

  if (typeof options.heapBytes === 'number') {
    return createHeapMeasurement(options.heapBytes);
  }

  return {
    bytes: null,
    limitation:
      '지원하는 브라우저 메모리 API가 없어 peak를 추정하지 않았습니다.',
    source: 'unavailable',
  };
}

function createHeapMeasurement(
  heapBytes: number,
  prefix?: string
): MemoryMeasurement {
  const heapLimitation =
    'performance.memory의 JS heap 추정치만 관측했으며 WASM·네이티브 메모리와 연속 peak는 포함하지 않습니다.';

  return {
    bytes: heapBytes,
    limitation: prefix ? `${prefix} ${heapLimitation}` : heapLimitation,
    source: 'performance.memory',
  };
}

async function measureUserAgentMemory(
  options: Readonly<{
    measureUserAgentSpecificMemory: NonNullable<
      MemoryMeasurementOptions['measureUserAgentSpecificMemory']
    >;
    measureUserAgentSpecificMemoryReceiver?: object;
    timeoutMs: number;
  }>
): Promise<MemoryMeasurement> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<MemoryMeasurement>((resolvePromise) => {
    timeoutId = setTimeout(() => {
      resolvePromise({
        bytes: null,
        limitation: `UA 특정 메모리 측정이 ${options.timeoutMs}ms 안에 끝나지 않아 peak를 추정하지 않았습니다.`,
        source: 'timed-out',
      });
    }, options.timeoutMs);
  });
  const measurement = options.measureUserAgentSpecificMemory
    .bind(options.measureUserAgentSpecificMemoryReceiver)()
    .then(
      ({ bytes }) => ({
        bytes,
        limitation:
          '단계 경계에서 측정한 UA 특정 메모리이며 연속 peak가 아닙니다.',
        source: 'measureUserAgentSpecificMemory' as const,
      }),
      () => ({
        bytes: null,
        limitation:
          'UA 특정 메모리 측정 API가 거부되어 peak를 추정하지 않았습니다.',
        source: 'unavailable' as const,
      })
    );

  try {
    return await Promise.race([measurement, timedOut]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}
