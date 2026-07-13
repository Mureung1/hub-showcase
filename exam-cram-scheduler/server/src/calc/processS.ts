// 계산_모델_리서치.md 1장 "Process S(수면압)" 수식 그대로 구현
const CHI_SLEEP = 4.2; // 자는 동안 방전 속도(시간)
const CHI_WAKE = 18.2; // 깨어있는 동안 충전 속도(시간)
const CEILING = 1; // μ, 충전 상한선

export interface SleepPressureSegment {
  /** 이번 구간(수면 또는 각성)이 시작된 시각. 자정 기준 경과 시간(0~24+) */
  startTime: number;
  /** 구간 시작 시점의 피로도(H₀) */
  startPressure: number;
  isAsleep: boolean;
}

export function sleepPressure(t: number, segment: SleepPressureSegment): number {
  const { startTime, startPressure, isAsleep } = segment;
  const elapsed = startTime - t;

  if (isAsleep) {
    return startPressure * Math.exp(elapsed / CHI_SLEEP);
  }
  return CEILING + (startPressure - CEILING) * Math.exp(elapsed / CHI_WAKE);
}
