export interface MonotonicClock { now(): number }
export const performanceClock: MonotonicClock = { now: () => performance.now() };
