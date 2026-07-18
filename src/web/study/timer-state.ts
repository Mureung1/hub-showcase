export interface TimerState { readonly running: boolean; readonly startedAt: number | null; readonly elapsedSeconds: number; readonly clientSessionId: string }
export function startTimer(state: TimerState, now: number): TimerState { return state.running ? state : { ...state, running: true, startedAt: now }; }
export function stopTimer(state: TimerState, now: number): TimerState { if (!state.running || state.startedAt === null) return state; return { ...state, running: false, startedAt: null, elapsedSeconds: state.elapsedSeconds + Math.max(0, Math.floor((now - state.startedAt) / 1000)) }; }
