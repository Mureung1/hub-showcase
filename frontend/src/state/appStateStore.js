import { createContext } from 'react'
import { WAIT_SECS_INITIAL } from '../lib/format'

// 프로토타입 초기 state (extracted-source.md §4). `screen`은 라우트가 대신한다.
export const initialState = {
  letter: '',
  title: '',
  envelope: null,
  showConfirm: false,
  showArrived: false,
  phase: 'idle', // 'idle' | 'waiting' | 'arrived'
  opened: false,
  replying: false,
  toast: '',
  tab: 'mine', // 'mine' | 'received' | 'linked'
  waitSecs: WAIT_SECS_INITIAL,
  showFeedback: false,
  feedback: '',
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_TITLE':
      return { ...state, title: action.value }
    case 'SET_LETTER':
      return { ...state, letter: action.value }
    case 'SET_ENVELOPE':
      return { ...state, envelope: action.value }
    case 'SHOW_CONFIRM':
      return { ...state, showConfirm: true }
    case 'HIDE_CONFIRM':
      return { ...state, showConfirm: false }
    case 'SHOW_ARRIVED':
      return { ...state, showArrived: true }
    case 'START_WAITING':
      // 발송 완료: 작성 중이던 편지를 비우고 24h 대기 클럭을 시작한다
      return {
        ...state,
        showArrived: false,
        phase: 'waiting',
        waitSecs: WAIT_SECS_INITIAL,
        letter: '',
        title: '',
        envelope: null,
      }
    case 'TICK': {
      if (state.phase !== 'waiting') return state
      const next = state.waitSecs - 1
      return next <= 0 ? { ...state, waitSecs: 0, phase: 'arrived' } : { ...state, waitSecs: next }
    }
    case 'FAST_FORWARD':
      return { ...state, phase: 'arrived', waitSecs: 0 }
    case 'RESET_RECOMMEND':
      return { ...state, opened: false }
    case 'UNFOLD':
      return { ...state, opened: true }
    case 'START_REPLY':
      return { ...state, replying: true, opened: false }
    case 'CANCEL_REPLY':
      return { ...state, replying: false }
    case 'SHOW_FEEDBACK':
      return { ...state, showFeedback: true }
    case 'SET_FEEDBACK':
      return { ...state, feedback: action.value }
    case 'SET_TAB':
      return { ...state, tab: action.value }
    case 'SET_TOAST':
      return { ...state, toast: action.value }
    case 'RESET_AFTER_SEND':
      // 새 편지 발송 완료 후 작성 화면 초기화 (답장/피드백 완료 포함)
      return {
        ...state,
        letter: '',
        title: '',
        envelope: null,
        replying: false,
        showFeedback: false,
        feedback: '',
        phase: 'idle',
        waitSecs: WAIT_SECS_INITIAL,
      }
    default:
      return state
  }
}

export const AppStateContext = createContext(null)

export const TOAST_DURATION_MS = 2500
